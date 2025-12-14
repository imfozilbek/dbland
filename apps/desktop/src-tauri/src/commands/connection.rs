use crate::state::connection_pool::{ConnectionConfig, DatabaseType};
use crate::storage::sqlite::SavedConnection;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{command, State};

/// Connection configuration from frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfigDto {
    pub id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    #[serde(rename = "authDatabase")]
    pub auth_database: Option<String>,
    pub tls: Option<bool>,
}

impl ConnectionConfigDto {
    fn to_pool_config(&self, id: String) -> Option<ConnectionConfig> {
        let db_type = DatabaseType::from_str(&self.db_type)?;

        Some(ConnectionConfig {
            id,
            name: self.name.clone(),
            db_type,
            host: self.host.clone(),
            port: self.port,
            username: self.username.clone(),
            password: self.password.clone(),
            database: self.database.clone(),
            auth_database: self.auth_database.clone(),
            tls: self.tls.unwrap_or(false),
        })
    }
}

/// Connection response for frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionDto {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub database: Option<String>,
    #[serde(rename = "authDatabase")]
    pub auth_database: Option<String>,
    pub tls: bool,
    pub status: String,
    #[serde(rename = "lastConnectedAt")]
    pub last_connected_at: Option<String>,
}

impl From<SavedConnection> for ConnectionDto {
    fn from(conn: SavedConnection) -> Self {
        Self {
            id: conn.id,
            name: conn.name,
            db_type: conn.db_type,
            host: conn.host,
            port: conn.port,
            username: conn.username,
            database: conn.database,
            auth_database: conn.auth_database,
            tls: conn.tls,
            status: "disconnected".to_string(),
            last_connected_at: conn.last_connected_at,
        }
    }
}

/// Test connection result
#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionResult {
    pub success: bool,
    pub message: String,
    #[serde(rename = "latencyMs")]
    pub latency_ms: Option<u64>,
    #[serde(rename = "serverVersion")]
    pub server_version: Option<String>,
}

/// Test a database connection without fully connecting
#[command]
pub async fn test_connection(
    state: State<'_, Arc<AppState>>,
    config: ConnectionConfigDto,
) -> Result<TestConnectionResult, String> {
    let id = config.id.clone().unwrap_or_else(|| "test".to_string());

    let pool_config = config
        .to_pool_config(id)
        .ok_or_else(|| format!("Unsupported database type: {}", config.db_type))?;

    let result = state.pool.test_connection(&pool_config).await;

    match result {
        Ok(test_result) => Ok(TestConnectionResult {
            success: test_result.success,
            message: test_result.message,
            latency_ms: test_result.latency_ms,
            server_version: test_result.server_version,
        }),
        Err(e) => Ok(TestConnectionResult {
            success: false,
            message: e.to_string(),
            latency_ms: None,
            server_version: None,
        }),
    }
}

/// Connect to a database
#[command]
pub async fn connect(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<bool, String> {
    // Get connection from storage
    let saved = state
        .storage
        .get(&connection_id)
        .map_err(|e| e.to_string())?;

    let db_type = DatabaseType::from_str(&saved.db_type)
        .ok_or_else(|| format!("Unsupported database type: {}", saved.db_type))?;

    let config = ConnectionConfig {
        id: saved.id.clone(),
        name: saved.name,
        db_type,
        host: saved.host,
        port: saved.port,
        username: saved.username,
        password: saved.password,
        database: saved.database,
        auth_database: saved.auth_database,
        tls: saved.tls,
    };

    state.pool.connect(config).await.map_err(|e| e.to_string())?;

    // Update last connected time
    let _ = state.storage.update_last_connected(&connection_id);

    Ok(true)
}

/// Disconnect from a database
#[command]
pub async fn disconnect(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<bool, String> {
    state
        .pool
        .disconnect(&connection_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Get all saved connections
#[command]
pub async fn get_connections(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<ConnectionDto>, String> {
    let saved = state.storage.get_all().map_err(|e| e.to_string())?;

    let active = state.pool.get_active_connections().await;

    let connections: Vec<ConnectionDto> = saved
        .into_iter()
        .map(|conn| {
            let mut dto: ConnectionDto = conn.into();
            if active.contains(&dto.id) {
                dto.status = "connected".to_string();
            }
            dto
        })
        .collect();

    Ok(connections)
}

/// Save a connection configuration
#[command]
pub async fn save_connection(
    state: State<'_, Arc<AppState>>,
    config: ConnectionConfigDto,
) -> Result<ConnectionDto, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = config
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let saved = SavedConnection {
        id: id.clone(),
        name: config.name.clone(),
        db_type: config.db_type.clone(),
        host: config.host.clone(),
        port: config.port,
        username: config.username.clone(),
        password: config.password.clone(),
        database: config.database.clone(),
        auth_database: config.auth_database.clone(),
        tls: config.tls.unwrap_or(false),
        created_at: now.clone(),
        updated_at: now,
        last_connected_at: None,
    };

    state.storage.save(&saved).map_err(|e| e.to_string())?;

    Ok(saved.into())
}

/// Delete a connection
#[command]
pub async fn delete_connection(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<bool, String> {
    // Disconnect if connected
    let _ = state.pool.disconnect(&connection_id).await;

    // Delete from storage
    state
        .storage
        .delete(&connection_id)
        .map_err(|e| e.to_string())
}
