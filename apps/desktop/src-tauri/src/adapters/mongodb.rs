use async_trait::async_trait;
use mongodb::{
    bson::{doc, Document},
    options::ClientOptions,
    Client,
};
use std::sync::Arc;
use tokio::sync::RwLock;

use super::{
    AdapterError, CollectionInfo, DatabaseAdapter, DatabaseInfo, QueryResult, TestResult,
};

/// MongoDB connection configuration
#[derive(Debug, Clone)]
pub struct MongoDbConfig {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub auth_database: Option<String>,
    pub replica_set: Option<String>,
    pub tls: bool,
}

impl MongoDbConfig {
    /// Build MongoDB connection URI
    pub fn to_uri(&self) -> String {
        let mut uri = String::from("mongodb://");

        // Add credentials if provided
        if let (Some(username), Some(password)) = (&self.username, &self.password) {
            let encoded_user = urlencoding::encode(username);
            let encoded_pass = urlencoding::encode(password);
            uri.push_str(&format!("{}:{}@", encoded_user, encoded_pass));
        }

        // Add host and port
        uri.push_str(&format!("{}:{}", self.host, self.port));

        // Add options
        let mut options = Vec::new();

        if let Some(ref auth_db) = self.auth_database {
            options.push(format!("authSource={}", auth_db));
        }

        if let Some(ref rs) = self.replica_set {
            options.push(format!("replicaSet={}", rs));
        }

        if self.tls {
            options.push("tls=true".to_string());
        }

        if !options.is_empty() {
            uri.push_str("/?");
            uri.push_str(&options.join("&"));
        }

        uri
    }
}

impl Default for MongoDbConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 27017,
            username: None,
            password: None,
            auth_database: None,
            replica_set: None,
            tls: false,
        }
    }
}

/// MongoDB database adapter
pub struct MongoDbAdapter {
    config: MongoDbConfig,
    pub client: Arc<RwLock<Option<Client>>>,
}

impl MongoDbAdapter {
    /// Create a new MongoDB adapter
    pub fn new(config: MongoDbConfig) -> Self {
        Self {
            config,
            client: Arc::new(RwLock::new(None)),
        }
    }

    /// Get the MongoDB client
    async fn get_client(&self) -> Result<Client, AdapterError> {
        let guard = self.client.read().await;
        guard.clone().ok_or(AdapterError::NotConnected)
    }

    /// Parse a simple find query from string and reject server-side eval operators.
    ///
    /// Top-level must be a JSON object. We deny `$where`, `$function`, `$accumulator`
    /// anywhere in the tree — they execute JS on the server and turn a query
    /// into an injection vector when user input flows in unsanitised.
    fn parse_find_query(query: &str) -> Result<Document, AdapterError> {
        let value: serde_json::Value = serde_json::from_str(query)
            .map_err(|e| AdapterError::QueryFailed(format!("Invalid query JSON: {}", e)))?;

        if !value.is_object() {
            return Err(AdapterError::QueryFailed(
                "Top-level query must be a JSON object".to_string(),
            ));
        }

        Self::reject_unsafe_operators(&value)?;

        mongodb::bson::to_document(&value)
            .map_err(|e| AdapterError::QueryFailed(format!("Invalid BSON: {}", e)))
    }

    /// Recursively walk the query tree and reject blacklisted operators.
    fn reject_unsafe_operators(value: &serde_json::Value) -> Result<(), AdapterError> {
        const DENY_LIST: &[&str] = &["$where", "$function", "$accumulator", "$expr.$function"];

        match value {
            serde_json::Value::Object(map) => {
                for (key, child) in map {
                    if DENY_LIST.iter().any(|d| *d == key.as_str()) {
                        return Err(AdapterError::QueryFailed(format!(
                            "Operator '{}' is not allowed (server-side JS execution)",
                            key
                        )));
                    }
                    Self::reject_unsafe_operators(child)?;
                }
                Ok(())
            }
            serde_json::Value::Array(items) => {
                for item in items {
                    Self::reject_unsafe_operators(item)?;
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }
}

#[async_trait]
impl DatabaseAdapter for MongoDbAdapter {
    async fn test_connection(&self) -> Result<TestResult, AdapterError> {
        let start = std::time::Instant::now();
        let uri = self.config.to_uri();

        match ClientOptions::parse(&uri).await {
            Ok(options) => match Client::with_options(options) {
                Ok(client) => {
                    // Try to ping the server
                    match client.database("admin").run_command(doc! { "ping": 1 }).await {
                        Ok(_) => {
                            // Get server version
                            let version = client
                                .database("admin")
                                .run_command(doc! { "buildInfo": 1 })
                                .await
                                .ok()
                                .and_then(|doc| doc.get_str("version").ok().map(|s| s.to_string()));

                            Ok(TestResult {
                                success: true,
                                message: "Connection successful".to_string(),
                                latency_ms: Some(start.elapsed().as_millis() as u64),
                                server_version: version,
                            })
                        }
                        Err(e) => Ok(TestResult {
                            success: false,
                            message: format!("Ping failed: {}", e),
                            latency_ms: None,
                            server_version: None,
                        }),
                    }
                }
                Err(e) => Ok(TestResult {
                    success: false,
                    message: format!("Client creation failed: {}", e),
                    latency_ms: None,
                    server_version: None,
                }),
            },
            Err(e) => Ok(TestResult {
                success: false,
                message: format!("Invalid connection string: {}", e),
                latency_ms: None,
                server_version: None,
            }),
        }
    }

    async fn connect(&mut self) -> Result<(), AdapterError> {
        let uri = self.config.to_uri();

        let options = ClientOptions::parse(&uri)
            .await
            .map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;

        let client = Client::with_options(options)
            .map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;

        // Verify connection with ping
        client
            .database("admin")
            .run_command(doc! { "ping": 1 })
            .await
            .map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;

        let mut guard = self.client.write().await;
        *guard = Some(client);

        Ok(())
    }

    async fn disconnect(&mut self) -> Result<(), AdapterError> {
        let mut guard = self.client.write().await;
        *guard = None;
        Ok(())
    }

    fn is_connected(&self) -> bool {
        // This is a simplified check - in practice we'd need async
        // For now, we rely on the RwLock state
        true
    }

    async fn get_databases(&self) -> Result<Vec<DatabaseInfo>, AdapterError> {
        let client = self.get_client().await?;

        let db_names = client
            .list_database_names()
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        let mut databases = Vec::new();

        for name in db_names {
            // Get database stats
            let db = client.database(&name);
            let stats = db.run_command(doc! { "dbStats": 1 }).await.ok();

            let size_bytes = stats
                .as_ref()
                .and_then(|s| s.get_i64("dataSize").ok())
                .map(|s| s as u64);

            let collection_count = stats
                .as_ref()
                .and_then(|s| s.get_i32("collections").ok())
                .map(|c| c as u64);

            databases.push(DatabaseInfo {
                name,
                size_bytes,
                collection_count,
            });
        }

        Ok(databases)
    }

    async fn get_collections(&self, database: &str) -> Result<Vec<CollectionInfo>, AdapterError> {
        let client = self.get_client().await?;
        let db = client.database(database);

        let coll_names = db
            .list_collection_names()
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        let mut collections = Vec::new();

        for name in coll_names {
            // Get collection stats
            let stats = db
                .run_command(doc! { "collStats": &name })
                .await
                .ok();

            let document_count = stats
                .as_ref()
                .and_then(|s| s.get_i64("count").ok())
                .map(|c| c as u64);

            let size_bytes = stats
                .as_ref()
                .and_then(|s| s.get_i64("size").ok())
                .map(|s| s as u64);

            collections.push(CollectionInfo {
                name,
                database_name: database.to_string(),
                document_count,
                size_bytes,
            });
        }

        Ok(collections)
    }

    async fn execute_query(
        &self,
        database: &str,
        collection: Option<&str>,
        query: &str,
    ) -> Result<QueryResult, AdapterError> {
        let start = std::time::Instant::now();
        let client = self.get_client().await?;
        let db = client.database(database);

        // For now, support simple find queries on collections
        let collection_name = collection.ok_or_else(|| {
            AdapterError::QueryFailed("Collection name required for query".to_string())
        })?;

        let coll = db.collection::<Document>(collection_name);
        let filter = Self::parse_find_query(query)?;

        let mut cursor = coll
            .find(filter)
            .await
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        let mut documents = Vec::new();

        use futures::stream::StreamExt;
        while let Some(result) = cursor.next().await {
            match result {
                Ok(doc) => {
                    // Convert BSON to JSON
                    let json = mongodb::bson::to_document(&doc)
                        .ok()
                        .and_then(|d| serde_json::to_value(&d).ok())
                        .unwrap_or(serde_json::Value::Null);
                    documents.push(json);
                }
                Err(e) => {
                    return Err(AdapterError::QueryFailed(e.to_string()));
                }
            }
        }

        let count = documents.len() as u64;

        Ok(QueryResult {
            success: true,
            documents,
            execution_time_ms: start.elapsed().as_millis() as u64,
            documents_affected: count,
            error: None,
        })
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}
