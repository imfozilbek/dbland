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

/// Trait for database adapters
#[async_trait]
pub trait DatabaseAdapter: Send + Sync {
    /// Test connection without fully connecting
    async fn test_connection(&self) -> Result<TestResult, AdapterError>;

    /// Establish connection
    async fn connect(&mut self) -> Result<(), AdapterError>;

    /// Close connection
    async fn disconnect(&mut self) -> Result<(), AdapterError>;

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
