use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedQuery {
    pub id: i64,
    pub connection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub language: String,
    pub database_name: Option<String>,
    pub collection_name: Option<String>,
    pub tags: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewSavedQuery {
    pub connection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub language: String,
    pub database_name: Option<String>,
    pub collection_name: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSavedQuery {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub database_name: Option<String>,
    pub collection_name: Option<String>,
    pub tags: Option<String>,
}

pub struct SavedQueriesStorage {
    conn: Mutex<Connection>,
}

impl SavedQueriesStorage {
    pub fn new(db_path: std::path::PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // Create saved_queries table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS saved_queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                connection_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                query TEXT NOT NULL,
                language TEXT NOT NULL,
                database_name TEXT,
                collection_name TEXT,
                tags TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        )?;

        // Create index for faster lookups
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_saved_queries_connection
             ON saved_queries(connection_id, created_at DESC)",
            [],
        )?;

        // Create index for tag searches
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_saved_queries_tags
             ON saved_queries(tags)",
            [],
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn insert(&self, entry: &NewSavedQuery) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO saved_queries
             (connection_id, name, description, query, language, database_name, collection_name, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                entry.connection_id,
                entry.name,
                entry.description,
                entry.query,
                entry.language,
                entry.database_name,
                entry.collection_name,
                entry.tags,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    pub fn get_by_connection(&self, connection_id: &str) -> Result<Vec<SavedQuery>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, connection_id, name, description, query, language, database_name, collection_name, tags, created_at, updated_at
             FROM saved_queries
             WHERE connection_id = ?1
             ORDER BY created_at DESC",
        )?;

        let entries = stmt
            .query_map(params![connection_id], |row| {
                Ok(SavedQuery {
                    id: row.get(0)?,
                    connection_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    query: row.get(4)?,
                    language: row.get(5)?,
                    database_name: row.get(6)?,
                    collection_name: row.get(7)?,
                    tags: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }

    pub fn update(&self, entry: &UpdateSavedQuery) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE saved_queries
             SET name = ?1, description = ?2, query = ?3, database_name = ?4, collection_name = ?5, tags = ?6, updated_at = datetime('now')
             WHERE id = ?7",
            params![
                entry.name,
                entry.description,
                entry.query,
                entry.database_name,
                entry.collection_name,
                entry.tags,
                entry.id,
            ],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM saved_queries WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn search_by_name(
        &self,
        connection_id: &str,
        search_query: &str,
    ) -> Result<Vec<SavedQuery>> {
        let search_pattern = format!("%{}%", search_query);
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, connection_id, name, description, query, language, database_name, collection_name, tags, created_at, updated_at
             FROM saved_queries
             WHERE connection_id = ?1 AND name LIKE ?2
             ORDER BY created_at DESC",
        )?;

        let entries = stmt
            .query_map(params![connection_id, search_pattern], |row| {
                Ok(SavedQuery {
                    id: row.get(0)?,
                    connection_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    query: row.get(4)?,
                    language: row.get(5)?,
                    database_name: row.get(6)?,
                    collection_name: row.get(7)?,
                    tags: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }

    pub fn get_by_tag(&self, connection_id: &str, tag: &str) -> Result<Vec<SavedQuery>> {
        let tag_pattern = format!("%{}%", tag);
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, connection_id, name, description, query, language, database_name, collection_name, tags, created_at, updated_at
             FROM saved_queries
             WHERE connection_id = ?1 AND tags LIKE ?2
             ORDER BY created_at DESC",
        )?;

        let entries = stmt
            .query_map(params![connection_id, tag_pattern], |row| {
                Ok(SavedQuery {
                    id: row.get(0)?,
                    connection_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    query: row.get(4)?,
                    language: row.get(5)?,
                    database_name: row.get(6)?,
                    collection_name: row.get(7)?,
                    tags: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }
}
