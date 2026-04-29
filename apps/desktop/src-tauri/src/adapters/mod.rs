pub mod mongodb;
pub mod redis;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Database adapter errors
#[derive(Debug, Error)]
pub enum AdapterError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Query execution failed: {0}")]
    QueryFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Database not found: {0}")]
    DatabaseNotFound(String),

    #[error("Collection not found: {0}")]
    CollectionNotFound(String),

    #[error("Operation timeout")]
    Timeout,

    #[error("Not connected")]
    NotConnected,
}

impl From<AdapterError> for String {
    fn from(error: AdapterError) -> Self {
        error.to_string()
    }
}

/// Database information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub size_bytes: Option<u64>,
    pub collection_count: Option<u64>,
}

/// Collection information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionInfo {
    pub name: String,
    pub database_name: String,
    pub document_count: Option<u64>,
    pub size_bytes: Option<u64>,
}

/// Query execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub success: bool,
    pub documents: Vec<serde_json::Value>,
    pub execution_time_ms: u64,
    pub documents_affected: u64,
    pub error: Option<String>,
}

/// Connection test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
    pub server_version: Option<String>,
}

/// Trait for database adapters.
///
/// `connect` and `disconnect` take `&self` rather than `&mut self`
/// because both supported adapters (`MongoDbAdapter`, `RedisAdapter`)
/// already gate their underlying client/connection behind interior
/// mutability (`Arc<RwLock<Option<...>>>`). The `&mut self` shape was
/// an artifact of an earlier draft — it forced `ConnectionPool` to
/// own the adapter as `Box<dyn DatabaseAdapter>`, which in turn
/// forced reader paths (`execute_query`, `get_databases`, …) to hold
/// the pool's read lock across the entire driver call. A 30-second
/// query then blocked every other write on the pool (connect, save,
/// disconnect on *unrelated* ids) until it returned.
///
/// With `&self`, the pool stores adapters as `Arc<dyn DatabaseAdapter>`
/// and reader paths can clone the Arc out under a brief read-lock,
/// release the lock, and `await` the driver call lock-free.
#[async_trait]
pub trait DatabaseAdapter: Send + Sync {
    /// Test connection without fully connecting
    async fn test_connection(&self) -> Result<TestResult, AdapterError>;

    /// Establish connection
    async fn connect(&self) -> Result<(), AdapterError>;

    /// Close connection
    async fn disconnect(&self) -> Result<(), AdapterError>;

    /// Get list of databases
    async fn get_databases(&self) -> Result<Vec<DatabaseInfo>, AdapterError>;

    /// Get list of collections in a database
    async fn get_collections(&self, database: &str) -> Result<Vec<CollectionInfo>, AdapterError>;

    /// Execute a query
    async fn execute_query(
        &self,
        database: &str,
        collection: Option<&str>,
        query: &str,
    ) -> Result<QueryResult, AdapterError>;
}
