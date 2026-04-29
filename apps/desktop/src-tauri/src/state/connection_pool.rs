use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::adapters::{
    mongodb::{MongoDbAdapter, MongoDbConfig},
    redis::{RedisAdapter, RedisConfig},
    AdapterError, DatabaseAdapter, TestResult,
};
use crate::tunnel::{SSHTunnel, SSHTunnelConfig};

/// Database type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatabaseType {
    MongoDB,
    Redis,
}

impl DatabaseType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "mongodb" => Some(Self::MongoDB),
            "redis" => Some(Self::Redis),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::MongoDB => "mongodb",
            Self::Redis => "redis",
        }
    }
}

/// Connection configuration from frontend
#[derive(Debug, Clone)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub auth_database: Option<String>,
    pub tls: bool,
    pub ssh: Option<SSHTunnelConfig>,
}

/// Active connection wrapper
struct ActiveConnection {
    adapter: Box<dyn DatabaseAdapter>,
    config: ConnectionConfig,
    tunnel: Option<SSHTunnel>,
}

/// Connection pool manages all active database connections
pub struct ConnectionPool {
    connections: Arc<RwLock<HashMap<String, ActiveConnection>>>,
}

impl Default for ConnectionPool {
    fn default() -> Self {
        Self::new()
    }
}

impl ConnectionPool {
    /// Create a new connection pool
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Test a connection without storing it.
    ///
    /// Brings up the SSH tunnel (if enabled) for the duration of the
    /// test so the result reflects the *full* connection path the user
    /// is about to commit to. Without this, "Test Connection" would
    /// silently bypass the tunnel — handshaking directly against
    /// `host:port` from the desktop machine — and report green for
    /// configurations that will fail at real `connect()` time because
    /// the SSH jump host is unreachable, the credentials are wrong,
    /// or the local forward port is already bound.
    ///
    /// The tunnel is dropped at the end of the test; nothing is
    /// stored in the pool.
    pub async fn test_connection(
        &self,
        config: &ConnectionConfig,
    ) -> Result<TestResult, AdapterError> {
        let (_tunnel, effective_config) = Self::prepare_effective_config(config.clone())?;
        let adapter = Self::create_adapter(&effective_config)?;
        adapter.test_connection().await
    }

    /// Connect and store the connection
    pub async fn connect(&self, config: ConnectionConfig) -> Result<(), AdapterError> {
        let (tunnel, effective_config) = Self::prepare_effective_config(config.clone())?;

        let mut adapter = Self::create_adapter(&effective_config)?;
        adapter.connect().await?;

        let active = ActiveConnection {
            adapter,
            config: config.clone(),
            tunnel,
        };

        let mut guard = self.connections.write().await;
        guard.insert(config.id.clone(), active);

        Ok(())
    }

    /// Disconnect and remove from pool.
    ///
    /// Tear down both the driver and the SSH tunnel even if one of
    /// them errors. The previous shape used `?` to bail right after
    /// `adapter.disconnect()` — meaning a driver-side failure left an
    /// orphaned SSH tunnel running, with the local forwarded port
    /// still bound, even though the connection had already been
    /// removed from the pool and the UI marked it disconnected. The
    /// next reconnect would then fail with "address already in use".
    /// We now run the tunnel teardown unconditionally and surface
    /// whichever error happened first to the caller.
    pub async fn disconnect(&self, connection_id: &str) -> Result<(), AdapterError> {
        let mut guard = self.connections.write().await;

        let Some(mut active) = guard.remove(connection_id) else {
            return Ok(());
        };
        // Drop the pool lock before doing the (potentially slow) driver
        // disconnect — other readers can keep iterating active
        // connections while one is shutting down.
        drop(guard);

        let driver_result = active.adapter.disconnect().await;

        if let Some(mut tunnel) = active.tunnel.take() {
            tunnel.stop();
        }

        driver_result
    }

    /// Check if a connection exists and is active
    pub async fn is_connected(&self, connection_id: &str) -> bool {
        let guard = self.connections.read().await;
        guard.contains_key(connection_id)
    }

    /// Get list of active connection IDs
    pub async fn get_active_connections(&self) -> Vec<String> {
        let guard = self.connections.read().await;
        guard.keys().cloned().collect()
    }

    /// Get the database type for a stored connection, if known.
    /// Used by commands that need to label history entries with the
    /// correct query language (mongodb vs redis) instead of guessing.
    pub async fn database_type(&self, connection_id: &str) -> Option<DatabaseType> {
        let guard = self.connections.read().await;
        guard.get(connection_id).map(|c| c.config.db_type)
    }

    /// Execute an operation on a connection
    pub async fn with_connection<F, T>(&self, connection_id: &str, operation: F) -> Result<T, AdapterError>
    where
        F: FnOnce(&dyn DatabaseAdapter) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, AdapterError>> + Send + '_>>,
    {
        let guard = self.connections.read().await;
        let active = guard
            .get(connection_id)
            .ok_or(AdapterError::NotConnected)?;

        operation(active.adapter.as_ref()).await
    }

    /// Get databases for a connection
    pub async fn get_databases(
        &self,
        connection_id: &str,
    ) -> Result<Vec<crate::adapters::DatabaseInfo>, AdapterError> {
        let guard = self.connections.read().await;
        let active = guard
            .get(connection_id)
            .ok_or(AdapterError::NotConnected)?;

        active.adapter.get_databases().await
    }

    /// Get collections for a database
    pub async fn get_collections(
        &self,
        connection_id: &str,
        database: &str,
    ) -> Result<Vec<crate::adapters::CollectionInfo>, AdapterError> {
        let guard = self.connections.read().await;
        let active = guard
            .get(connection_id)
            .ok_or(AdapterError::NotConnected)?;

        active.adapter.get_collections(database).await
    }

    /// Execute a query
    pub async fn execute_query(
        &self,
        connection_id: &str,
        database: &str,
        collection: Option<&str>,
        query: &str,
    ) -> Result<crate::adapters::QueryResult, AdapterError> {
        let guard = self.connections.read().await;
        let active = guard
            .get(connection_id)
            .ok_or(AdapterError::NotConnected)?;

        active.adapter.execute_query(database, collection, query).await
    }

    /// If the config asks for an SSH tunnel, bring it up and return a
    /// rewritten config that points at the local forwarded port. The
    /// tunnel handle must outlive the resulting adapter — drop it and
    /// the forward closes mid-handshake.
    ///
    /// Centralises the tunnel-bring-up so `connect` and
    /// `test_connection` follow exactly the same code path. Previously
    /// only `connect` did this, which meant a green "Test Connection"
    /// said nothing about whether the real `connect()` would actually
    /// succeed through the tunnel.
    fn prepare_effective_config(
        config: ConnectionConfig,
    ) -> Result<(Option<SSHTunnel>, ConnectionConfig), AdapterError> {
        // Take the SSH config out of the input early. If it isn't there
        // or isn't enabled, fall straight through with the original
        // config — the previous shape used `.expect("checked above")` to
        // re-extract it after a separate boolean check, which was a
        // panic site that would in theory never fire but still lived in
        // production code.
        let ssh_config = match config.ssh.clone() {
            Some(ssh) if ssh.enabled => ssh,
            _ => return Ok((None, config)),
        };

        let mut tunnel = SSHTunnel::new(ssh_config, config.host.clone(), config.port).map_err(
            |e: crate::tunnel::ssh::SSHTunnelError| AdapterError::ConnectionFailed(e.to_string()),
        )?;

        tunnel
            .start()
            .map_err(|e: crate::tunnel::ssh::SSHTunnelError| {
                AdapterError::ConnectionFailed(e.to_string())
            })?;

        let local_port = tunnel.local_port();
        let mut effective_config = config;
        effective_config.host = "127.0.0.1".to_string();
        effective_config.port = local_port;

        Ok((Some(tunnel), effective_config))
    }

    /// Create an adapter based on config.
    ///
    /// Associated function — there is no `&self` state to consult, the
    /// match arms only depend on the input config. Matches the shape
    /// of `prepare_effective_config` above so call sites read as a
    /// flat pipeline (`Self::prepare_effective_config` →
    /// `Self::create_adapter`) rather than a mix of method and
    /// associated calls.
    fn create_adapter(config: &ConnectionConfig) -> Result<Box<dyn DatabaseAdapter>, AdapterError> {
        match config.db_type {
            DatabaseType::MongoDB => {
                let mongo_config = MongoDbConfig {
                    host: config.host.clone(),
                    port: config.port,
                    username: config.username.clone(),
                    password: config.password.clone(),
                    auth_database: config.auth_database.clone(),
                    replica_set: None,
                    tls: config.tls,
                };
                Ok(Box::new(MongoDbAdapter::new(mongo_config)))
            }
            DatabaseType::Redis => {
                let database = parse_redis_db_index(config.database.as_deref());
                let redis_config = RedisConfig {
                    host: config.host.clone(),
                    port: config.port,
                    password: config.password.clone(),
                    database,
                    tls: config.tls,
                };
                Ok(Box::new(RedisAdapter::new(redis_config)))
            }
        }
    }
}

/// Coerce the shared `database` field on `ConnectionConfig` into a
/// Redis DB index.
///
/// The same field doubles as a MongoDB database name (string) and a
/// Redis DB index (u8 in 0..=15 for the default `databases 16` in
/// `redis.conf`). For the Redis branch:
///
///   * `None` or an all-whitespace string → silently fall through to
///     0. Both are common — "I don't care, give me the default".
///   * Anything else that fails to parse as `u8` → log at warn and
///     still fall through to 0. We don't fail the connection over a
///     small typo when the cost is a connection to db 0; the warn is
///     there so the cause is visible if the user notices.
///
/// Extracted from `create_adapter` so the rule is testable without
/// touching the rest of the pool wiring.
fn parse_redis_db_index(raw: Option<&str>) -> u8 {
    let Some(raw) = raw else { return 0 };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return 0;
    }
    match trimmed.parse::<u8>() {
        Ok(n) => n,
        Err(_) => {
            log::warn!(
                "redis db field is not a valid u8 ({:?}); falling back to 0",
                raw
            );
            0
        }
    }
}

#[cfg(test)]
mod prepare_effective_config_tests {
    use super::*;
    use crate::tunnel::ssh::SSHAuthMethod;
    use crate::tunnel::SSHTunnelConfig;

    fn base_config() -> ConnectionConfig {
        ConnectionConfig {
            id: "c1".to_string(),
            name: "test".to_string(),
            db_type: DatabaseType::MongoDB,
            host: "db.example.com".to_string(),
            port: 27017,
            username: None,
            password: None,
            database: None,
            auth_database: None,
            tls: false,
            ssh: None,
        }
    }

    /// No SSH config → return the original config unchanged, no tunnel.
    #[test]
    fn no_ssh_returns_config_untouched() {
        let cfg = base_config();
        let (tunnel, effective) =
            ConnectionPool::prepare_effective_config(cfg.clone()).expect("must succeed");
        assert!(tunnel.is_none());
        assert_eq!(effective.host, cfg.host);
        assert_eq!(effective.port, cfg.port);
    }

    /// SSH config attached but `enabled = false` → still no tunnel,
    /// host/port preserved. The previous implementation tripped on
    /// this case by always entering the tunnel-setup branch and then
    /// re-checking `enabled` with `.expect`; the explicit gate here
    /// avoids that panic site.
    #[test]
    fn ssh_disabled_returns_config_untouched() {
        let mut cfg = base_config();
        cfg.ssh = Some(SSHTunnelConfig {
            enabled: false,
            host: "jump.example.com".to_string(),
            port: 22,
            username: "tunneluser".to_string(),
            auth_method: SSHAuthMethod::Agent,
            password: None,
            private_key_path: None,
            passphrase: None,
        });

        let original_host = cfg.host.clone();
        let original_port = cfg.port;

        let (tunnel, effective) =
            ConnectionPool::prepare_effective_config(cfg).expect("must succeed");

        assert!(tunnel.is_none(), "disabled SSH must not start a tunnel");
        assert_eq!(effective.host, original_host);
        assert_eq!(effective.port, original_port);
    }
}

#[cfg(test)]
mod redis_db_index_tests {
    use super::parse_redis_db_index;

    #[test]
    fn none_falls_through_to_zero() {
        assert_eq!(parse_redis_db_index(None), 0);
    }

    #[test]
    fn empty_string_falls_through_to_zero() {
        assert_eq!(parse_redis_db_index(Some("")), 0);
    }

    #[test]
    fn whitespace_only_falls_through_to_zero() {
        assert_eq!(parse_redis_db_index(Some("   ")), 0);
    }

    #[test]
    fn valid_index_parses() {
        assert_eq!(parse_redis_db_index(Some("0")), 0);
        assert_eq!(parse_redis_db_index(Some("5")), 5);
        assert_eq!(parse_redis_db_index(Some("15")), 15);
    }

    #[test]
    fn surrounding_whitespace_is_tolerated() {
        assert_eq!(parse_redis_db_index(Some("  7  ")), 7);
    }

    #[test]
    fn unparseable_values_fall_back_to_zero() {
        // Both should fall back without panicking. The warn-log side
        // effect is exercised in the runtime; here we just lock in the
        // deterministic return value.
        assert_eq!(parse_redis_db_index(Some("abc")), 0);
        assert_eq!(parse_redis_db_index(Some("0xff")), 0);
        assert_eq!(parse_redis_db_index(Some("-1")), 0);
        // u8::MAX = 255; "256" doesn't fit, so falls back.
        assert_eq!(parse_redis_db_index(Some("256")), 0);
    }
}
