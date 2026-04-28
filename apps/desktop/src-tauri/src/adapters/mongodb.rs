use async_trait::async_trait;
use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, Credential},
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
    /// Build a credential-free MongoDB connection URI.
    ///
    /// Credentials are intentionally **not** embedded in the URI — they
    /// are attached to `ClientOptions::credential` separately (see
    /// `build_client_options`). Keeping them out of the string means:
    /// - errors from `ClientOptions::parse` cannot echo the password
    ///   back to the user as part of "invalid connection string: …"
    /// - logs that capture the URI for debugging never carry secrets
    /// - URL-encoding edge cases (special chars in passwords like `@`,
    ///   `:`, `/`) cannot break the parser
    pub fn to_uri(&self) -> String {
        let mut uri = format!("mongodb://{}:{}", self.host, self.port);

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

    /// Build the credential block to attach to `ClientOptions` after
    /// parsing. Returns `None` when no username is configured — in that
    /// case the driver connects without authentication.
    ///
    /// `Credential` is `#[non_exhaustive]` so we mutate the built value
    /// directly instead of trying to thread optional setters through
    /// `typed_builder`'s type-state encoding (each setter changes the
    /// builder's type, so a let-mut cascade doesn't compile).
    fn credential(&self) -> Option<Credential> {
        let username = self.username.clone()?;
        let mut credential = Credential::builder().username(username).build();
        credential.password = self.password.clone();
        credential.source = self.auth_database.clone();
        Some(credential)
    }

    /// Parse a credential-free URI and attach the credential block.
    /// Centralised so test/connect paths cannot drift out of sync.
    async fn build_client_options(&self) -> Result<ClientOptions, AdapterError> {
        let uri = self.to_uri();
        let mut options = ClientOptions::parse(&uri)
            .await
            .map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;
        options.credential = self.credential();
        Ok(options)
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

        let options = match self.config.build_client_options().await {
            Ok(o) => o,
            Err(e) => {
                return Ok(TestResult {
                    success: false,
                    message: format!("Invalid connection options: {}", e),
                    latency_ms: None,
                    server_version: None,
                });
            }
        };

        match Client::with_options(options) {
            Ok(client) => {
                // Try to ping the server
                match client.database("admin").run_command(doc! { "ping": 1 }).await {
                    Ok(_) => {
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
        }
    }

    async fn connect(&mut self) -> Result<(), AdapterError> {
        let options = self.config.build_client_options().await?;

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
        // Reflect the actual stored client state instead of always
        // returning `true`. The previous version was a footgun: any
        // caller using `is_connected()` as a precondition gate got a
        // false positive even after `disconnect()` cleared the inner
        // client. `try_read` keeps the check non-blocking; a concurrent
        // writer (connect/disconnect mid-flight) reports not-connected,
        // which matches the user-visible meaning of "is the connection
        // currently usable".
        self.client
            .try_read()
            .map(|guard| guard.is_some())
            .unwrap_or(false)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(q: &str) -> Result<Document, AdapterError> {
        MongoDbAdapter::parse_find_query(q)
    }

    #[test]
    fn parse_find_query_accepts_a_simple_filter() {
        let doc = parse(r#"{"name": "alice", "age": 30}"#).unwrap();
        assert_eq!(doc.get_str("name").unwrap(), "alice");
        assert_eq!(doc.get_i64("age").unwrap(), 30);
    }

    #[test]
    fn parse_find_query_accepts_safe_operators() {
        // $gt, $in, $and etc. should still pass
        parse(r#"{"age": {"$gt": 18}}"#).unwrap();
        parse(r#"{"$or": [{"a": 1}, {"b": 2}]}"#).unwrap();
    }

    #[test]
    fn parse_find_query_rejects_top_level_dollar_where() {
        let err = parse(r#"{"$where": "this.x == 1"}"#).unwrap_err();
        let msg = err.to_string();
        assert!(msg.contains("$where"), "got: {}", msg);
    }

    #[test]
    fn parse_find_query_rejects_nested_dollar_where() {
        let err = parse(r#"{"$or": [{"a": 1}, {"$where": "true"}]}"#).unwrap_err();
        assert!(err.to_string().contains("$where"));
    }

    #[test]
    fn parse_find_query_rejects_dollar_function() {
        let err =
            parse(r#"{"$expr": {"$function": {"body": "function(){}", "args": [], "lang": "js"}}}"#)
                .unwrap_err();
        assert!(err.to_string().contains("$function"));
    }

    #[test]
    fn parse_find_query_rejects_dollar_accumulator() {
        let err = parse(r#"{"$accumulator": {"init": "function(){}"}}"#).unwrap_err();
        assert!(err.to_string().contains("$accumulator"));
    }

    #[test]
    fn parse_find_query_rejects_non_object_top_level() {
        assert!(parse(r#"[1, 2, 3]"#).is_err());
        assert!(parse(r#""just a string""#).is_err());
        assert!(parse(r#"42"#).is_err());
    }

    #[test]
    fn parse_find_query_rejects_invalid_json() {
        assert!(parse(r#"{not valid"#).is_err());
    }

    fn config_with_creds() -> MongoDbConfig {
        MongoDbConfig {
            host: "db.example.com".to_string(),
            port: 27017,
            username: Some("dbuser".to_string()),
            password: Some("p@ss:word/with#special!".to_string()),
            auth_database: Some("admin".to_string()),
            replica_set: None,
            tls: false,
        }
    }

    #[test]
    fn uri_does_not_contain_password() {
        let uri = config_with_creds().to_uri();
        assert!(
            !uri.contains("p@ss:word"),
            "password leaked into URI: {}",
            uri
        );
    }

    #[test]
    fn uri_does_not_contain_username() {
        // Without creds in the URI, parse errors cannot echo them back.
        let uri = config_with_creds().to_uri();
        assert!(
            !uri.contains("dbuser"),
            "username leaked into URI: {}",
            uri
        );
    }

    #[test]
    fn credential_is_built_from_config() {
        let cred = config_with_creds().credential().expect("creds present");
        assert_eq!(cred.username.as_deref(), Some("dbuser"));
        assert_eq!(cred.password.as_deref(), Some("p@ss:word/with#special!"));
        assert_eq!(cred.source.as_deref(), Some("admin"));
    }

    #[test]
    fn credential_returns_none_without_username() {
        let cfg = MongoDbConfig {
            username: None,
            password: None,
            ..MongoDbConfig::default()
        };
        assert!(cfg.credential().is_none());
    }
}
