use parking_lot::Mutex;
use rusqlite::{params, Connection, Result, Row};
use serde::{Deserialize, Serialize};

/// Single source of truth for the projection — used by all four read
/// paths (`get_by_id`, `get_by_connection`, `search_by_name`,
/// `get_by_tag`). Keeping it next to the row decoder ensures the index
/// map below stays correct: shifting either by one column without the
/// other would silently decode the wrong field into each struct slot.
const SELECT_COLUMNS: &str = "id, connection_id, name, description, query, language, \
                              database_name, collection_name, tags, created_at, updated_at";

/// Decode a single result row into `SavedQuery`. Replaces four
/// near-identical 12-line closures inlined at every read call-site.
fn saved_query_from_sql(row: &Row<'_>) -> Result<SavedQuery> {
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
}

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
        let conn = self.conn.lock();
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

    /// Fetch a single saved query by its primary key. Used by
    /// `save_query` to return the freshly-inserted row to the caller —
    /// the previous version pulled `get_by_connection` (potentially
    /// thousands of rows) and filtered in memory just to find the one
    /// row we knew the id of.
    pub fn get_by_id(&self, id: i64) -> Result<Option<SavedQuery>> {
        let conn = self.conn.lock();
        let sql = format!("SELECT {} FROM saved_queries WHERE id = ?1", SELECT_COLUMNS);
        let mut stmt = conn.prepare(&sql)?;

        let row = stmt.query_row(params![id], saved_query_from_sql).ok();

        Ok(row)
    }

    pub fn get_by_connection(&self, connection_id: &str) -> Result<Vec<SavedQuery>> {
        let conn = self.conn.lock();
        let sql = format!(
            "SELECT {} FROM saved_queries WHERE connection_id = ?1 ORDER BY created_at DESC",
            SELECT_COLUMNS
        );
        let mut stmt = conn.prepare(&sql)?;

        let entries = stmt
            .query_map(params![connection_id], saved_query_from_sql)?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }

    pub fn update(&self, entry: &UpdateSavedQuery) -> Result<()> {
        let conn = self.conn.lock();
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
        let conn = self.conn.lock();
        conn.execute("DELETE FROM saved_queries WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Delete every saved query bound to `connection_id`. Called when
    /// the connection itself is deleted — without this cascade the
    /// rows orphaned in `saved_queries.db` were invisible to the user
    /// (no UI), kept growing forever, and would resurface as someone
    /// else's saved queries the moment a connection ID got reused.
    pub fn delete_by_connection(&self, connection_id: &str) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute(
            "DELETE FROM saved_queries WHERE connection_id = ?1",
            params![connection_id],
        )?;
        Ok(())
    }

    pub fn search_by_name(
        &self,
        connection_id: &str,
        search_query: &str,
    ) -> Result<Vec<SavedQuery>> {
        let search_pattern = format!("%{}%", search_query);
        let conn = self.conn.lock();
        let sql = format!(
            "SELECT {} FROM saved_queries \
             WHERE connection_id = ?1 AND name LIKE ?2 \
             ORDER BY created_at DESC",
            SELECT_COLUMNS
        );
        let mut stmt = conn.prepare(&sql)?;

        let entries = stmt
            .query_map(params![connection_id, search_pattern], saved_query_from_sql)?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }

    pub fn get_by_tag(&self, connection_id: &str, tag: &str) -> Result<Vec<SavedQuery>> {
        let tag_pattern = format!("%{}%", tag);
        let conn = self.conn.lock();
        let sql = format!(
            "SELECT {} FROM saved_queries \
             WHERE connection_id = ?1 AND tags LIKE ?2 \
             ORDER BY created_at DESC",
            SELECT_COLUMNS
        );
        let mut stmt = conn.prepare(&sql)?;

        let entries = stmt
            .query_map(params![connection_id, tag_pattern], saved_query_from_sql)?
            .collect::<Result<Vec<_>>>()?;

        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn fresh_storage() -> (TempDir, SavedQueriesStorage) {
        // `NamedTempFile` would race-create the file with 0 bytes and
        // then `Connection::open` saw it as read-only. A `TempDir` plus
        // a non-existent filename inside lets SQLite create the file
        // itself with the right permissions.
        let dir = TempDir::new().expect("temp dir");
        let storage = SavedQueriesStorage::new(dir.path().join("saved.db")).expect("storage");
        (dir, storage)
    }

    fn entry(connection_id: &str, name: &str) -> NewSavedQuery {
        NewSavedQuery {
            connection_id: connection_id.to_string(),
            name: name.to_string(),
            description: None,
            query: "{}".to_string(),
            language: "mongodb".to_string(),
            database_name: None,
            collection_name: None,
            tags: None,
        }
    }

    #[test]
    fn delete_by_connection_only_drops_matching_rows() {
        let (_dir, storage) = fresh_storage();

        storage.insert(&entry("conn-a", "q1")).unwrap();
        storage.insert(&entry("conn-a", "q2")).unwrap();
        storage.insert(&entry("conn-b", "kept")).unwrap();

        storage.delete_by_connection("conn-a").unwrap();

        assert!(storage.get_by_connection("conn-a").unwrap().is_empty());
        let kept = storage.get_by_connection("conn-b").unwrap();
        assert_eq!(kept.len(), 1);
        assert_eq!(kept[0].name, "kept");
    }

    #[test]
    fn delete_by_connection_is_a_noop_when_no_rows_match() {
        let (_dir, storage) = fresh_storage();
        storage.insert(&entry("conn-a", "q1")).unwrap();

        // No row for conn-zzz; the call must succeed without affecting
        // unrelated rows or returning an error.
        storage.delete_by_connection("conn-zzz").unwrap();

        assert_eq!(storage.get_by_connection("conn-a").unwrap().len(), 1);
    }

    #[test]
    fn get_by_id_returns_the_inserted_row() {
        let (_dir, storage) = fresh_storage();
        let id = storage.insert(&entry("conn-a", "q1")).unwrap();

        let fetched = storage.get_by_id(id).unwrap().expect("row must exist");
        assert_eq!(fetched.id, id);
        assert_eq!(fetched.name, "q1");
    }

    #[test]
    fn get_by_id_returns_none_for_missing_id() {
        let (_dir, storage) = fresh_storage();
        assert!(storage.get_by_id(99_999).unwrap().is_none());
    }
}
