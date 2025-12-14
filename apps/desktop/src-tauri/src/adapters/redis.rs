use async_trait::async_trait;
use redis::{aio::MultiplexedConnection, AsyncCommands, Client};
use std::sync::Arc;
use tokio::sync::RwLock;

use super::{
    AdapterError, CollectionInfo, DatabaseAdapter, DatabaseInfo, QueryResult, TestResult,
};

/// Redis connection configuration
#[derive(Debug, Clone)]
pub struct RedisConfig {
    pub host: String,
    pub port: u16,
    pub password: Option<String>,
    pub database: u8,
    pub tls: bool,
}

impl RedisConfig {
    /// Build Redis connection URL
    pub fn to_url(&self) -> String {
        let protocol = if self.tls { "rediss" } else { "redis" };

        let auth = self
            .password
            .as_ref()
            .map(|p| format!(":{}@", urlencoding::encode(p)))
            .unwrap_or_default();

        format!(
            "{}://{}{}:{}/{}",
            protocol, auth, self.host, self.port, self.database
        )
    }
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 6379,
            password: None,
            database: 0,
            tls: false,
        }
    }
}

/// Redis database adapter
pub struct RedisAdapter {
    config: RedisConfig,
    connection: Arc<RwLock<Option<MultiplexedConnection>>>,
}

impl RedisAdapter {
    /// Create a new Redis adapter
    pub fn new(config: RedisConfig) -> Self {
        Self {
            config,
            connection: Arc::new(RwLock::new(None)),
        }
    }

    /// Get the Redis connection
    async fn get_connection(&self) -> Result<MultiplexedConnection, AdapterError> {
        let guard = self.connection.read().await;
        guard.clone().ok_or(AdapterError::NotConnected)
    }
}

#[async_trait]
impl DatabaseAdapter for RedisAdapter {
    async fn test_connection(&self) -> Result<TestResult, AdapterError> {
        let start = std::time::Instant::now();
        let url = self.config.to_url();

        match Client::open(url) {
            Ok(client) => match client.get_multiplexed_tokio_connection().await {
                Ok(mut conn) => {
                    // PING command
                    let result: Result<String, _> = redis::cmd("PING").query_async(&mut conn).await;

                    match result {
                        Ok(_) => {
                            // Get server info
                            let info: Result<String, _> =
                                redis::cmd("INFO").arg("server").query_async(&mut conn).await;

                            let version = info.ok().and_then(|info| {
                                info.lines()
                                    .find(|line| line.starts_with("redis_version:"))
                                    .map(|line| line.replace("redis_version:", ""))
                            });

                            Ok(TestResult {
                                success: true,
                                message: "Connection successful".to_string(),
                                latency_ms: Some(start.elapsed().as_millis() as u64),
                                server_version: version,
                            })
                        }
                        Err(e) => Ok(TestResult {
                            success: false,
                            message: format!("PING failed: {}", e),
                            latency_ms: None,
                            server_version: None,
                        }),
                    }
                }
                Err(e) => Ok(TestResult {
                    success: false,
                    message: format!("Connection failed: {}", e),
                    latency_ms: None,
                    server_version: None,
                }),
            },
            Err(e) => Ok(TestResult {
                success: false,
                message: format!("Invalid URL: {}", e),
                latency_ms: None,
                server_version: None,
            }),
        }
    }

    async fn connect(&mut self) -> Result<(), AdapterError> {
        let url = self.config.to_url();

        let client =
            Client::open(url).map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;

        let conn = client
            .get_multiplexed_tokio_connection()
            .await
            .map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;

        let mut guard = self.connection.write().await;
        *guard = Some(conn);

        Ok(())
    }

    async fn disconnect(&mut self) -> Result<(), AdapterError> {
        let mut guard = self.connection.write().await;
        *guard = None;
        Ok(())
    }

    fn is_connected(&self) -> bool {
        true
    }

    async fn get_databases(&self) -> Result<Vec<DatabaseInfo>, AdapterError> {
        let mut conn = self.get_connection().await?;

        // Get keyspace info for all databases
        let info: String = redis::cmd("INFO")
            .arg("keyspace")
            .query_async(&mut conn)
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        let mut databases = Vec::new();

        // Parse keyspace info (format: db0:keys=123,expires=0,avg_ttl=0)
        for line in info.lines() {
            if line.starts_with("db") {
                if let Some((db_name, stats)) = line.split_once(':') {
                    let key_count = stats
                        .split(',')
                        .find(|s| s.starts_with("keys="))
                        .and_then(|s| s.strip_prefix("keys="))
                        .and_then(|s| s.parse::<u64>().ok());

                    databases.push(DatabaseInfo {
                        name: db_name.to_string(),
                        size_bytes: None,
                        collection_count: key_count,
                    });
                }
            }
        }

        // If no databases found, at least show db0
        if databases.is_empty() {
            databases.push(DatabaseInfo {
                name: "db0".to_string(),
                size_bytes: None,
                collection_count: Some(0),
            });
        }

        Ok(databases)
    }

    async fn get_collections(&self, database: &str) -> Result<Vec<CollectionInfo>, AdapterError> {
        let mut conn = self.get_connection().await?;

        // Select the database
        let db_num: u8 = database
            .strip_prefix("db")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);

        redis::cmd("SELECT")
            .arg(db_num)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        // Get all keys (with pattern matching for grouping)
        let keys: Vec<String> = conn
            .keys("*")
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        // Group keys by prefix (before first : or entire key)
        let mut prefixes: std::collections::HashMap<String, u64> = std::collections::HashMap::new();

        for key in &keys {
            let prefix = key.split(':').next().unwrap_or(key).to_string();
            *prefixes.entry(prefix).or_insert(0) += 1;
        }

        let collections: Vec<CollectionInfo> = prefixes
            .into_iter()
            .map(|(prefix, count)| CollectionInfo {
                name: prefix,
                database_name: database.to_string(),
                document_count: Some(count),
                size_bytes: None,
            })
            .collect();

        Ok(collections)
    }

    async fn execute_query(
        &self,
        database: &str,
        _collection: Option<&str>,
        query: &str,
    ) -> Result<QueryResult, AdapterError> {
        let start = std::time::Instant::now();
        let mut conn = self.get_connection().await?;

        // Select the database
        let db_num: u8 = database
            .strip_prefix("db")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);

        redis::cmd("SELECT")
            .arg(db_num)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        // Parse and execute Redis command
        let parts: Vec<&str> = query.split_whitespace().collect();

        if parts.is_empty() {
            return Err(AdapterError::QueryFailed("Empty command".to_string()));
        }

        let mut cmd = redis::cmd(parts[0]);
        for arg in parts.iter().skip(1) {
            cmd.arg(*arg);
        }

        let result: redis::Value = cmd
            .query_async(&mut conn)
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        // Convert Redis value to JSON
        let json_value = redis_value_to_json(result);

        Ok(QueryResult {
            success: true,
            documents: vec![json_value],
            execution_time_ms: start.elapsed().as_millis() as u64,
            documents_affected: 1,
            error: None,
        })
    }
}

/// Convert Redis value to JSON
fn redis_value_to_json(value: redis::Value) -> serde_json::Value {
    match value {
        redis::Value::Nil => serde_json::Value::Null,
        redis::Value::Int(i) => serde_json::json!(i),
        redis::Value::BulkString(bytes) => {
            String::from_utf8(bytes)
                .map(|s| serde_json::json!(s))
                .unwrap_or(serde_json::Value::Null)
        }
        redis::Value::Array(arr) => {
            serde_json::Value::Array(arr.into_iter().map(redis_value_to_json).collect())
        }
        redis::Value::SimpleString(s) => serde_json::json!(s),
        redis::Value::Okay => serde_json::json!("OK"),
        redis::Value::Map(map) => {
            let obj: serde_json::Map<String, serde_json::Value> = map
                .into_iter()
                .filter_map(|(k, v)| {
                    if let redis::Value::BulkString(key_bytes) = k {
                        String::from_utf8(key_bytes)
                            .ok()
                            .map(|key| (key, redis_value_to_json(v)))
                    } else {
                        None
                    }
                })
                .collect();
            serde_json::Value::Object(obj)
        }
        redis::Value::Double(f) => serde_json::json!(f),
        redis::Value::Boolean(b) => serde_json::json!(b),
        redis::Value::VerbatimString { format: _, text } => serde_json::json!(text),
        redis::Value::BigNumber(n) => serde_json::json!(n.to_string()),
        redis::Value::Set(set) => {
            serde_json::Value::Array(set.into_iter().map(redis_value_to_json).collect())
        }
        redis::Value::Attribute { data, attributes: _ } => redis_value_to_json(*data),
        redis::Value::Push { kind: _, data } => {
            serde_json::Value::Array(data.into_iter().map(redis_value_to_json).collect())
        }
        redis::Value::ServerError(e) => serde_json::json!({ "error": format!("{:?}", e) }),
    }
}
