use async_trait::async_trait;
use redis::{
    aio::MultiplexedConnection, Client, ConnectionAddr, ConnectionInfo, RedisConnectionInfo,
};
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
    /// Build a `ConnectionInfo` with credentials set on the redis-side
    /// struct, never embedded in a URL.
    ///
    /// Mirrors the pattern used by the MongoDB adapter: keep secrets
    /// out of the connection-string layer entirely. The previous
    /// version embedded the password inside `redis://:<pw>@host:port/`
    /// (URL-encoded), which meant a parse error from `Client::open`
    /// could echo the URL back into the error message, any debug log
    /// that captured the URL string also captured the secret, and
    /// URL-encoding edge cases for special characters were a latent
    /// compat risk.
    ///
    /// The IPC-boundary `redact_error` covers the first via regex, but
    /// defense-in-depth says don't put the password in the string we
    /// render in the first place. Now it travels in
    /// `RedisConnectionInfo::password` only, which the redis crate
    /// uses for the `AUTH` handshake without ever stringifying.
    pub fn to_connection_info(&self) -> ConnectionInfo {
        let addr = if self.tls {
            ConnectionAddr::TcpTls {
                host: self.host.clone(),
                port: self.port,
                insecure: false,
                tls_params: None,
            }
        } else {
            ConnectionAddr::Tcp(self.host.clone(), self.port)
        };

        ConnectionInfo {
            addr,
            redis: RedisConnectionInfo {
                db: self.database as i64,
                username: None,
                password: self.password.clone(),
                ..Default::default()
            },
        }
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
        let info = self.config.to_connection_info();

        match Client::open(info) {
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
                message: format!("Client creation failed: {}", e),
                latency_ms: None,
                server_version: None,
            }),
        }
    }

    async fn connect(&mut self) -> Result<(), AdapterError> {
        let info = self.config.to_connection_info();

        let client =
            Client::open(info).map_err(|e| AdapterError::ConnectionFailed(e.to_string()))?;

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

        // Walk the keyspace via SCAN, never KEYS.
        //
        // KEYS * is O(N) over the entire keyspace and blocks the whole
        // server thread while it runs — on a production cache with
        // millions of keys it freezes everything. Redis' own docs say
        // "use it in production environments with extreme care."
        // SCAN is the cursor-based replacement: each iteration returns
        // a small batch and yields between iterations so other clients
        // aren't starved.
        //
        // We cap the walk at SCAN_KEY_CAP entries so the schema browser
        // can't accidentally pull a 10M-key cache into memory just to
        // count prefixes. If the cap is hit, the panel surfaces "first N
        // of unknown total" copy in the UI so the user knows the
        // grouping isn't exhaustive.
        const SCAN_KEY_CAP: usize = 5_000;
        const SCAN_BATCH: usize = 500;

        let mut prefixes: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
        let mut total_scanned: usize = 0;
        let mut cursor: u64 = 0;

        loop {
            let (next_cursor, batch): (u64, Vec<String>) = redis::cmd("SCAN")
                .arg(cursor)
                .arg("COUNT")
                .arg(SCAN_BATCH)
                .query_async(&mut conn)
                .await
                .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

            for key in &batch {
                let prefix = key.split(':').next().unwrap_or(key).to_string();
                *prefixes.entry(prefix).or_insert(0) += 1;
            }

            total_scanned += batch.len();
            cursor = next_cursor;

            // SCAN ends when the cursor wraps back to 0; we also bail
            // out when we've collected enough to give the user a useful
            // grouping without dragging the whole keyspace through.
            if cursor == 0 || total_scanned >= SCAN_KEY_CAP {
                break
            }
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

        // Parse and execute Redis command. We tokenize like a shell so that
        // quoted arguments survive intact — `SET key "value with spaces"`
        // and `HSET h field 'a b c'` were previously split by
        // `split_whitespace()`, which silently truncated string values at
        // the first space and produced bizarre wrong-arity errors instead
        // of obvious quoting feedback.
        let parts = tokenize_redis_command(query)
            .map_err(|e| AdapterError::QueryFailed(e.to_string()))?;

        if parts.is_empty() {
            return Err(AdapterError::QueryFailed("Empty command".to_string()));
        }

        let mut cmd = redis::cmd(&parts[0]);
        for arg in parts.iter().skip(1) {
            cmd.arg(arg.as_str());
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

/// Tokenize a Redis command string the way `redis-cli` does: whitespace
/// separates tokens, single and double quotes wrap a single token (allowing
/// embedded whitespace), and `\` inside double quotes escapes the next
/// character. Mirrors the subset of POSIX shell quoting that real users
/// actually reach for when typing values like `SET k "hello world"` or
/// `HSET h field 'a b c'`.
///
/// Errors on an unterminated quote — silently swallowing the trailing
/// argument used to produce wrong-arity replies that looked like server
/// bugs.
fn tokenize_redis_command(input: &str) -> Result<Vec<String>, RedisTokenError> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut chars = input.chars().peekable();
    let mut in_token = false;
    let mut quote: Option<char> = None;

    while let Some(c) = chars.next() {
        match (quote, c) {
            (Some('"'), '\\') => {
                // Inside double quotes — \X drops the slash and keeps X.
                // If the input ends with a stray backslash, fall through
                // to push the literal `\`.
                if let Some(&next) = chars.peek() {
                    chars.next();
                    current.push(next);
                } else {
                    current.push('\\');
                }
            }
            (Some(q), c) if c == q => {
                quote = None;
                // Closing quote ends the current token boundary even
                // if the literal value was empty (e.g. `SET k ""`).
                in_token = true;
            }
            (Some(_), c) => {
                current.push(c);
            }
            (None, c) if c.is_whitespace() => {
                if in_token {
                    tokens.push(std::mem::take(&mut current));
                    in_token = false;
                }
            }
            (None, '"') | (None, '\'') => {
                quote = Some(c);
                in_token = true;
            }
            (None, c) => {
                current.push(c);
                in_token = true;
            }
        }
    }

    if quote.is_some() {
        return Err(RedisTokenError::UnterminatedQuote);
    }

    if in_token {
        tokens.push(current);
    }

    Ok(tokens)
}

#[derive(Debug, thiserror::Error)]
enum RedisTokenError {
    #[error("Unterminated quoted string in Redis command")]
    UnterminatedQuote,
}

#[cfg(test)]
mod tokenizer_tests {
    use super::*;

    #[test]
    fn splits_on_whitespace() {
        let tokens = tokenize_redis_command("SET key value").unwrap();
        assert_eq!(tokens, vec!["SET", "key", "value"]);
    }

    #[test]
    fn collapses_consecutive_whitespace() {
        let tokens = tokenize_redis_command("  SET   key    value  ").unwrap();
        assert_eq!(tokens, vec!["SET", "key", "value"]);
    }

    #[test]
    fn double_quoted_value_keeps_spaces() {
        let tokens = tokenize_redis_command(r#"SET k "value with spaces""#).unwrap();
        assert_eq!(tokens, vec!["SET", "k", "value with spaces"]);
    }

    #[test]
    fn single_quoted_value_keeps_spaces() {
        let tokens = tokenize_redis_command("HSET h field 'a b c'").unwrap();
        assert_eq!(tokens, vec!["HSET", "h", "field", "a b c"]);
    }

    #[test]
    fn double_quote_escapes_inner_quote() {
        let tokens = tokenize_redis_command(r#"SET k "say \"hi\"""#).unwrap();
        assert_eq!(tokens, vec!["SET", "k", r#"say "hi""#]);
    }

    #[test]
    fn empty_quoted_string_is_a_token() {
        let tokens = tokenize_redis_command(r#"SET k """#).unwrap();
        assert_eq!(tokens, vec!["SET", "k", ""]);
    }

    #[test]
    fn rejects_unterminated_quote() {
        assert!(tokenize_redis_command(r#"SET k "oops"#).is_err());
    }

    #[test]
    fn empty_input_yields_empty_vec() {
        let tokens = tokenize_redis_command("   ").unwrap();
        assert!(tokens.is_empty());
    }

    /// The password lives in `RedisConnectionInfo::password`, not in
    /// `ConnectionAddr` (which only carries host/port). Locks in the
    /// invariant that no future refactor accidentally re-introduces a
    /// URL-encoded `:pw@host` form by checking `Debug` output (the
    /// channel through which a leaked URL would actually surface in
    /// logs and error toasts).
    #[test]
    fn connection_info_keeps_password_off_the_address() {
        let cfg = RedisConfig {
            host: "redis.example.com".to_string(),
            port: 6379,
            password: Some("p@ss:word/with#special!".to_string()),
            database: 3,
            tls: false,
        };

        let info = cfg.to_connection_info();
        assert_eq!(info.redis.password.as_deref(), Some("p@ss:word/with#special!"));
        assert_eq!(info.redis.db, 3);

        // The `Debug` impl on `ConnectionAddr` is what shows up in
        // error messages — it must not contain the secret.
        let addr_debug = format!("{:?}", info.addr);
        assert!(
            !addr_debug.contains("p@ss:word"),
            "password leaked into ConnectionAddr Debug: {}",
            addr_debug
        );
    }

    #[test]
    fn connection_info_uses_tcp_tls_when_tls_enabled() {
        let cfg = RedisConfig {
            tls: true,
            host: "secure.example.com".to_string(),
            port: 6380,
            ..RedisConfig::default()
        };

        match cfg.to_connection_info().addr {
            redis::ConnectionAddr::TcpTls { insecure, .. } => {
                assert!(!insecure, "must verify hostname by default");
            }
            other => panic!("expected TcpTls, got {:?}", other),
        }
    }
}
