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
        let adapter = self.create_adapter(&effective_config)?;
        adapter.test_connection().await
    }

    /// Connect and store the connection
    pub async fn connect(&self, config: ConnectionConfig) -> Result<(), AdapterError> {
        let (tunnel, effective_config) = Self::prepare_effective_config(config.clone())?;

        let mut adapter = self.create_adapter(&effective_config)?;
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

    /// Disconnect and remove from pool
    pub async fn disconnect(&self, connection_id: &str) -> Result<(), AdapterError> {
        let mut guard = self.connections.write().await;

        if let Some(mut active) = guard.remove(connection_id) {
            active.adapter.disconnect().await?;

            // Stop SSH tunnel if exists
            if let Some(mut tunnel) = active.tunnel {
                tunnel.stop();
            }
        }

        Ok(())
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

    /// Create an adapter based on config
    fn create_adapter(&self, config: &ConnectionConfig) -> Result<Box<dyn DatabaseAdapter>, AdapterError> {
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
                let redis_config = RedisConfig {
                    host: config.host.clone(),
                    port: config.port,
                    password: config.password.clone(),
                    database: config
                        .database
                        .as_ref()
                        .and_then(|d| d.parse().ok())
                        .unwrap_or(0),
                    tls: config.tls,
                };
                Ok(Box::new(RedisAdapter::new(redis_config)))
            }
        }
    }
}
