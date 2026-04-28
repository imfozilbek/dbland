use parking_lot::Mutex;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

use super::crypto::{Crypto, CryptoError};
use crate::tunnel::SSHTunnelConfig;

/// Ordered list of `(target_version, sql)` migration steps. Each step
/// runs at most once per database — `user_version` records the highest
/// applied target. Append new migrations to the end, never edit a
/// historical entry: an existing user's DB has already absorbed the
/// previous text, and changing it now would skip the new behaviour.
///
/// Use `CREATE TABLE IF NOT EXISTS` and similar guards inside the SQL
/// so a fresh install (which runs every step from 0) and a partial
/// upgrade (which resumes from where it stopped) both converge to the
/// same shape.
const MIGRATIONS: &[(u32, &str)] = &[
    (
        1,
        "CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            db_type TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT,
            password_encrypted TEXT,
            database_name TEXT,
            auth_database TEXT,
            tls INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_connected_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_connections_name ON connections(name);",
    ),
    (
        2,
        "ALTER TABLE connections ADD COLUMN ssh_config_encrypted TEXT;",
    ),
];

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Crypto error: {0}")]
    Crypto(#[from] CryptoError),

    #[error("Connection not found: {0}")]
    NotFound(String),

    #[error("Invalid data: {0}")]
    InvalidData(String),
}

/// Saved connection data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedConnection {
    pub id: String,
    pub name: String,
    pub db_type: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    pub database: Option<String>,
    pub auth_database: Option<String>,
    pub tls: bool,
    pub ssh: Option<SSHTunnelConfig>,
    pub created_at: String,
    pub updated_at: String,
    pub last_connected_at: Option<String>,
}

/// SQLite storage for connections
pub struct ConnectionStorage {
    conn: Mutex<Connection>,
    crypto: Crypto,
}

impl ConnectionStorage {
    /// Create a new connection storage
    pub fn new(db_path: PathBuf, encryption_key: &[u8]) -> Result<Self, StorageError> {
        let conn = Connection::open(&db_path)?;
        let crypto = Crypto::new(encryption_key)?;

        let storage = Self {
            conn: Mutex::new(conn),
            crypto,
        };

        storage.init_schema()?;

        Ok(storage)
    }

    /// Create an in-memory storage (for testing)
    pub fn in_memory(encryption_key: &[u8]) -> Result<Self, StorageError> {
        let conn = Connection::open_in_memory()?;
        let crypto = Crypto::new(encryption_key)?;

        let storage = Self {
            conn: Mutex::new(conn),
            crypto,
        };

        storage.init_schema()?;

        Ok(storage)
    }

    /// Run any schema migrations needed to bring the DB up to the
    /// current code version, tracked via SQLite's `user_version` pragma.
    ///
    /// Each migration is a `(target_version, sql)` pair applied
    /// in-order; on success `user_version` is bumped to its target
    /// inside the same transaction, so a crash mid-migration leaves
    /// the DB at the previous version and the next startup retries.
    /// Replaces the previous "blind `ALTER TABLE ADD COLUMN`, swallow
    /// the error" pattern, which silently masked real schema bugs and
    /// gave us no way to know which schema a file was actually at.
    fn init_schema(&self) -> Result<(), StorageError> {
        let mut conn = self.conn.lock();

        let current: u32 = conn
            .query_row("SELECT user_version FROM pragma_user_version", [], |row| {
                row.get(0)
            })
            .unwrap_or(0);

        for (target, sql) in MIGRATIONS {
            if current < *target {
                let tx = conn.transaction()?;
                tx.execute_batch(sql)?;
                // user_version cannot be parameterised, but `target` is a
                // hard-coded u32 from `MIGRATIONS` and never user input.
                tx.execute_batch(&format!("PRAGMA user_version = {}", target))?;
                tx.commit()?;
            }
        }

        Ok(())
    }

    /// Save a new connection or update existing
    pub fn save(&self, connection: &SavedConnection) -> Result<(), StorageError> {
        let conn = self.conn.lock();

        // Encrypt password if present
        let encrypted_password = connection
            .password
            .as_ref()
            .map(|p| self.crypto.encrypt_string(p))
            .transpose()?;

        // Encrypt SSH config if present
        let encrypted_ssh = connection
            .ssh
            .as_ref()
            .map(|ssh| {
                let json = serde_json::to_string(ssh)
                    .map_err(|_| CryptoError::EncryptionFailed("Failed to serialize SSH config".to_string()))?;
                self.crypto.encrypt_string(&json)
            })
            .transpose()?;

        conn.execute(
            "INSERT INTO connections (
                id, name, db_type, host, port, username, password_encrypted,
                database_name, auth_database, tls, ssh_config_encrypted, created_at, updated_at, last_connected_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                db_type = excluded.db_type,
                host = excluded.host,
                port = excluded.port,
                username = excluded.username,
                password_encrypted = excluded.password_encrypted,
                database_name = excluded.database_name,
                auth_database = excluded.auth_database,
                tls = excluded.tls,
                ssh_config_encrypted = excluded.ssh_config_encrypted,
                updated_at = excluded.updated_at,
                last_connected_at = excluded.last_connected_at",
            rusqlite::params![
                connection.id,
                connection.name,
                connection.db_type,
                connection.host,
                connection.port,
                connection.username,
                encrypted_password,
                connection.database,
                connection.auth_database,
                connection.tls as i32,
                encrypted_ssh,
                connection.created_at,
                connection.updated_at,
                connection.last_connected_at,
            ],
        )?;

        Ok(())
    }

    /// Get a connection by ID
    pub fn get(&self, id: &str) -> Result<SavedConnection, StorageError> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare(
            "SELECT id, name, db_type, host, port, username, password_encrypted,
                    database_name, auth_database, tls, ssh_config_encrypted, created_at, updated_at, last_connected_at
             FROM connections WHERE id = ?1",
        )?;

        let result = stmt.query_row([id], |row| {
            let encrypted_password: Option<String> = row.get(6)?;
            let ssh_config_encrypted: Option<String> = row.get(10)?;

            Ok(SavedConnectionRow {
                id: row.get(0)?,
                name: row.get(1)?,
                db_type: row.get(2)?,
                host: row.get(3)?,
                port: row.get(4)?,
                username: row.get(5)?,
                password_encrypted: encrypted_password,
                database: row.get(7)?,
                auth_database: row.get(8)?,
                tls: row.get::<_, i32>(9)? != 0,
                ssh_config_encrypted,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                last_connected_at: row.get(13)?,
            })
        });

        match result {
            Ok(row) => self.row_to_connection(row),
            Err(rusqlite::Error::QueryReturnedNoRows) => Err(StorageError::NotFound(id.to_string())),
            Err(e) => Err(StorageError::Database(e)),
        }
    }

    /// Get all connections
    pub fn get_all(&self) -> Result<Vec<SavedConnection>, StorageError> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare(
            "SELECT id, name, db_type, host, port, username, password_encrypted,
                    database_name, auth_database, tls, ssh_config_encrypted, created_at, updated_at, last_connected_at
             FROM connections ORDER BY name ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            let encrypted_password: Option<String> = row.get(6)?;
            let ssh_config_encrypted: Option<String> = row.get(10)?;

            Ok(SavedConnectionRow {
                id: row.get(0)?,
                name: row.get(1)?,
                db_type: row.get(2)?,
                host: row.get(3)?,
                port: row.get(4)?,
                username: row.get(5)?,
                password_encrypted: encrypted_password,
                database: row.get(7)?,
                auth_database: row.get(8)?,
                tls: row.get::<_, i32>(9)? != 0,
                ssh_config_encrypted,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                last_connected_at: row.get(13)?,
            })
        })?;

        let mut connections = Vec::new();
        for row_result in rows {
            let row = row_result?;
            connections.push(self.row_to_connection(row)?);
        }

        Ok(connections)
    }

    /// Delete a connection
    pub fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let conn = self.conn.lock();

        let affected = conn.execute("DELETE FROM connections WHERE id = ?1", [id])?;

        Ok(affected > 0)
    }

    /// Update last connected timestamp
    pub fn update_last_connected(&self, id: &str) -> Result<(), StorageError> {
        let conn = self.conn.lock();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE connections SET last_connected_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )?;

        Ok(())
    }

    /// Convert row to connection, decrypting password and SSH config
    fn row_to_connection(&self, row: SavedConnectionRow) -> Result<SavedConnection, StorageError> {
        let password = row
            .password_encrypted
            .as_ref()
            .map(|p| self.crypto.decrypt_string(p))
            .transpose()?;

        let ssh = row
            .ssh_config_encrypted
            .as_ref()
            .map(|encrypted| {
                let json = self.crypto.decrypt_string(encrypted)?;
                serde_json::from_str::<SSHTunnelConfig>(&json)
                    .map_err(|e| StorageError::InvalidData(e.to_string()))
            })
            .transpose()?;

        Ok(SavedConnection {
            id: row.id,
            name: row.name,
            db_type: row.db_type,
            host: row.host,
            port: row.port,
            username: row.username,
            password,
            database: row.database,
            auth_database: row.auth_database,
            tls: row.tls,
            ssh,
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_connected_at: row.last_connected_at,
        })
    }
}

/// Internal struct for database rows
struct SavedConnectionRow {
    id: String,
    name: String,
    db_type: String,
    host: String,
    port: u16,
    username: Option<String>,
    password_encrypted: Option<String>,
    database: Option<String>,
    auth_database: Option<String>,
    tls: bool,
    ssh_config_encrypted: Option<String>,
    created_at: String,
    updated_at: String,
    last_connected_at: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_and_get() {
        let key = Crypto::generate_key();
        let storage = ConnectionStorage::in_memory(&key).unwrap();

        let connection = SavedConnection {
            id: "test-id".to_string(),
            name: "Test Connection".to_string(),
            db_type: "mongodb".to_string(),
            host: "localhost".to_string(),
            port: 27017,
            username: Some("admin".to_string()),
            password: Some("secret123".to_string()),
            database: Some("testdb".to_string()),
            auth_database: Some("admin".to_string()),
            tls: false,
            ssh: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            last_connected_at: None,
        };

        storage.save(&connection).unwrap();

        let retrieved = storage.get("test-id").unwrap();
        assert_eq!(retrieved.name, "Test Connection");
        assert_eq!(retrieved.password, Some("secret123".to_string()));
    }

    #[test]
    fn test_get_all() {
        let key = Crypto::generate_key();
        let storage = ConnectionStorage::in_memory(&key).unwrap();

        let conn1 = SavedConnection {
            id: "id1".to_string(),
            name: "Alpha".to_string(),
            db_type: "mongodb".to_string(),
            host: "localhost".to_string(),
            port: 27017,
            username: None,
            password: None,
            database: None,
            auth_database: None,
            tls: false,
            ssh: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            last_connected_at: None,
        };

        let conn2 = SavedConnection {
            id: "id2".to_string(),
            name: "Beta".to_string(),
            db_type: "redis".to_string(),
            host: "localhost".to_string(),
            port: 6379,
            username: None,
            password: None,
            database: None,
            auth_database: None,
            tls: false,
            ssh: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            last_connected_at: None,
        };

        storage.save(&conn1).unwrap();
        storage.save(&conn2).unwrap();

        let all = storage.get_all().unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].name, "Alpha"); // Sorted by name
        assert_eq!(all[1].name, "Beta");
    }

    #[test]
    fn test_delete() {
        let key = Crypto::generate_key();
        let storage = ConnectionStorage::in_memory(&key).unwrap();

        let connection = SavedConnection {
            id: "to-delete".to_string(),
            name: "Delete Me".to_string(),
            db_type: "mongodb".to_string(),
            host: "localhost".to_string(),
            port: 27017,
            username: None,
            password: None,
            database: None,
            auth_database: None,
            tls: false,
            ssh: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
            last_connected_at: None,
        };

        storage.save(&connection).unwrap();
        assert!(storage.delete("to-delete").unwrap());
        assert!(storage.get("to-delete").is_err());
    }

    #[test]
    fn schema_reaches_latest_migration_version() {
        let key = Crypto::generate_key();
        let storage = ConnectionStorage::in_memory(&key).unwrap();
        let latest = MIGRATIONS.last().map(|(v, _)| *v).unwrap_or(0);

        let conn = storage.conn.lock();
        let version: u32 = conn
            .query_row("SELECT user_version FROM pragma_user_version", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(version, latest, "fresh DB should be at the latest version");
    }

    #[test]
    fn schema_init_is_idempotent() {
        // Two `init_schema` runs on the same connection must not double-apply
        // any migration — the second call should observe `user_version` and
        // skip everything.
        let key = Crypto::generate_key();
        let storage = ConnectionStorage::in_memory(&key).unwrap();
        storage.init_schema().expect("re-running init must succeed");
    }
}
