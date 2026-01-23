use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistoryEntry {
    pub id: i64,
    pub connection_id: String,
    pub query: String,
    pub language: String,
    pub database_name: Option<String>,
    pub collection_name: Option<String>,
    pub executed_at: String,
    pub execution_time_ms: u64,
    pub success: bool,
    pub result_count: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewQueryHistoryEntry {
    pub connection_id: String,
    pub query: String,
    pub language: String,
    pub database_name: Option<String>,
    pub collection_name: Option<String>,
    pub execution_time_ms: u64,
    pub success: bool,
    pub result_count: u64,
    pub error: Option<String>,
}

pub struct QueryHistoryStorage {
    conn: Mutex<Connection>,
}

impl QueryHistoryStorage {
    pub fn new(db_path: std::path::PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // Create query_history table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS query_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                connection_id TEXT NOT NULL,
                query TEXT NOT NULL,
                language TEXT NOT NULL,
                database_name TEXT,
                collection_name TEXT,
                executed_at TEXT NOT NULL DEFAULT (datetime('now')),
                execution_time_ms INTEGER NOT NULL,
                success INTEGER NOT NULL,
                result_count INTEGER NOT NULL,
                error TEXT
            )",
            [],
        )?;

        // Create index for faster lookups
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_query_history_connection
             ON query_history(connection_id, executed_at DESC)",
            [],
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn insert(&self, entry: &NewQueryHistoryEntry) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO query_history
             (connection_id, query, language, database_name, collection_name,
              execution_time_ms, success, result_count, error)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                entry.connection_id,
                entry.query,
                entry.language,
                entry.database_name,
                entry.collection_name,
                entry.execution_time_ms as i64,
                entry.success as i32,
                entry.result_count as i64,
                entry.error,
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    pub fn get_by_connection(&self, connection_id: &str, limit: i64) -> Result<Vec<QueryHistoryEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, connection_id, query, language, database_name, collection_name,
                    executed_at, execution_time_ms, success, result_count, error
             FROM query_history
             WHERE connection_id = ?1
             ORDER BY executed_at DESC
             LIMIT ?2",
        )?;

        let entries = stmt
            .query_map(params![connection_id, limit], |row| {
                Ok(QueryHistoryEntry {
                    id: row.get(0)?,
                    connection_id: row.get(1)?,
                    query: row.get(2)?,
                    language: row.get(3)?,
                    database_name: row.get(4)?,
                    collection_name: row.get(5)?,
                    executed_at: row.get(6)?,
                    execution_time_ms: row.get::<_, i64>(7)? as u64,
                    success: row.get::<_, i32>(8)? != 0,
                    result_count: row.get::<_, i64>(9)? as u64,
                    error: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }

    pub fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM query_history WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_by_connection(&self, connection_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM query_history WHERE connection_id = ?1",
            params![connection_id],
        )?;
        Ok(())
    }

    pub fn search(
        &self,
        connection_id: &str,
        search_query: &str,
        limit: i64,
    ) -> Result<Vec<QueryHistoryEntry>> {
        let search_pattern = format!("%{}%", search_query);
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, connection_id, query, language, database_name, collection_name,
                    executed_at, execution_time_ms, success, result_count, error
             FROM query_history
             WHERE connection_id = ?1 AND query LIKE ?2
             ORDER BY executed_at DESC
             LIMIT ?3",
        )?;

        let entries = stmt
            .query_map(params![connection_id, search_pattern, limit], |row| {
                Ok(QueryHistoryEntry {
                    id: row.get(0)?,
                    connection_id: row.get(1)?,
                    query: row.get(2)?,
                    language: row.get(3)?,
                    database_name: row.get(4)?,
                    collection_name: row.get(5)?,
                    executed_at: row.get(6)?,
                    execution_time_ms: row.get::<_, i64>(7)? as u64,
                    success: row.get::<_, i32>(8)? != 0,
                    result_count: row.get::<_, i64>(9)? as u64,
                    error: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }
}
