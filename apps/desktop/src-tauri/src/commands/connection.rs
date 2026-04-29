use crate::state::connection_pool::{ConnectionConfig, DatabaseType};
use crate::storage::sqlite::SavedConnection;
use crate::tunnel::SSHTunnelConfig;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{command, State};

/// Connection configuration from frontend.
///
/// `#[serde(rename_all = "camelCase")]` covers everything except the
/// `db_type` field, which has to keep its explicit `rename = "type"`
/// because:
///   1. Rust forbids `type` as a field name (reserved keyword);
///   2. the frontend's TS interface uses `type` (not `dbType`) and we
///      don't want to break that contract.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
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
    pub auth_database: Option<String>,
    pub tls: Option<bool>,
    pub ssh: Option<SSHTunnelConfig>,
}

impl ConnectionConfigDto {
    /// Reject obviously invalid inputs at the IPC boundary so we don't
    /// hand them to the driver and surface a confusing vendor error
    /// later. Specifically:
    ///   - empty / whitespace-only host (`mongodb://:27017` would be
    ///     parsed by the driver as "host = empty string" and fail with
    ///     a generic "DNS resolution failed");
    ///   - port `0` (technically valid as a u16 but never a real
    ///     outbound connection target — almost always a "user cleared
    ///     the field" sign);
    ///   - empty / whitespace-only name (saved connections need a
    ///     non-blank label or the picker becomes a row of empty strings).
    ///
    /// Unknown `db_type` is reported with the same shape so the caller
    /// gets one consistent "validation failed: …" pattern instead of a
    /// mix of `Option::None` and ad-hoc format strings.
    fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Connection name must not be empty".to_string());
        }
        if self.host.trim().is_empty() {
            return Err("Connection host must not be empty".to_string());
        }
        if self.port == 0 {
            return Err("Connection port must be between 1 and 65535".to_string());
        }
        if DatabaseType::from_str(&self.db_type).is_none() {
            return Err(format!("Unsupported database type: {}", self.db_type));
        }
        Ok(())
    }

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
            ssh: self.ssh.clone(),
        })
    }
}

/// Convert a `SavedConnection` (the storage row shape) into a
/// `ConnectionConfig` (the pool's runtime shape).
///
/// Mirrors `ConnectionConfigDto::to_pool_config` for the persisted-row
/// path. Pulled out as a free function rather than a method on
/// `SavedConnection` because `SavedConnection` lives in `crate::storage`
/// and `ConnectionConfig` lives in `crate::state` — wiring the
/// conversion onto either side would create a layer-crossing
/// dependency that doesn't otherwise exist. The helper sits in the
/// `commands` layer where the conversion is *used*, and both
/// originating layers stay self-contained.
///
/// `db_type` parsing is fallible (the persisted string could be from
/// a database type the running build no longer supports — e.g. a
/// future downgrade), so the return type is `Result`. The caller in
/// `connect` previously inlined this 12-line `ConnectionConfig { … }`
/// literal; centralising it keeps the row-to-runtime mapping in one
/// place if a new field is added.
fn saved_to_pool_config(saved: SavedConnection) -> Result<ConnectionConfig, String> {
    let db_type = DatabaseType::from_str(&saved.db_type)
        .ok_or_else(|| format!("Unsupported database type: {}", saved.db_type))?;
    Ok(ConnectionConfig {
        id: saved.id,
        name: saved.name,
        db_type,
        host: saved.host,
        port: saved.port,
        username: saved.username,
        password: saved.password,
        database: saved.database,
        auth_database: saved.auth_database,
        tls: saved.tls,
        ssh: saved.ssh,
    })
}

/// Connection response for frontend.
///
/// Same `db_type` → `type` exception as `ConnectionConfigDto` (see
/// the docstring there).
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDto {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub database: Option<String>,
    pub auth_database: Option<String>,
    pub tls: bool,
    pub status: String,
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
#[serde(rename_all = "camelCase")]
pub struct TestConnectionResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
    pub server_version: Option<String>,
}

/// Test a database connection without fully connecting
#[command]
pub async fn test_connection(
    state: State<'_, Arc<AppState>>,
    config: ConnectionConfigDto,
) -> Result<TestConnectionResult, String> {
    config.validate()?;

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
            // Test-connection is the highest credential-leak risk
            // path: a malformed URI from the user almost guarantees
            // the driver echoes the input string verbatim. Redact
            // before it crosses IPC into a frontend toast.
            message: crate::redact_error(e.to_string()),
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
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let config = saved_to_pool_config(saved)?;

    state.pool.connect(config).await.map_err(|e| crate::redact_error(e.to_string()))?;

    // The driver is up; failing the whole IPC call because we couldn't
    // stamp `last_connected_at` would punish the user for a bookkeeping
    // miss they can't act on. Log and move on — the rest of the file
    // uses the same shape for non-fatal storage errors.
    if let Err(e) = state.storage.update_last_connected(&connection_id) {
        log::warn!("failed to stamp last_connected_at for {}: {}", connection_id, e);
    }

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
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(true)
}

/// Get all saved connections
#[command]
pub async fn get_connections(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<ConnectionDto>, String> {
    let saved = state.storage.get_all().map_err(|e| crate::redact_error(e.to_string()))?;

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
    config.validate()?;

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
        ssh: config.ssh.clone(),
        created_at: now.clone(),
        updated_at: now,
        last_connected_at: None,
    };

    state.storage.save(&saved).map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(saved.into())
}

/// Delete a connection.
///
/// Performs a best-effort cascade:
///   1. Tear down the live driver / SSH tunnel if active.
///   2. Delete the connection row.
///   3. Clear its query history.
///   4. Drop its saved queries.
///
/// Steps 3 and 4 are best-effort — a failure there leaves the
/// connection record gone but the dependent rows behind, which is
/// strictly preferable to refusing the delete and leaving the user
/// stuck with a connection they can't remove. Errors are logged but
/// not surfaced to the IPC caller.
///
/// Without the cascade those rows used to orphan invisibly (no UI to
/// reach them), accumulate over time, and — worse — resurface as
/// someone else's history if a connection_id ever got reused.
#[command]
pub async fn delete_connection(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<bool, String> {
    // Tear down a live driver/tunnel if there is one. A failure here
    // (e.g. tunnel already gone, adapter mid-shutdown) must not block
    // the delete — the user's intent is "remove this row", and the
    // pool entry is reaped by `disconnect` anyway. Log so it's
    // diagnosable without surfacing a confusing error toast.
    if let Err(e) = state.pool.disconnect(&connection_id).await {
        log::warn!("disconnect during delete failed for {}: {}", connection_id, e);
    }

    let deleted = state
        .storage
        .delete(&connection_id)
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if let Err(e) = state.query_history.clear_by_connection(&connection_id) {
        log::warn!("failed to clear query history on delete: {}", e);
    }
    if let Err(e) = state.saved_queries.delete_by_connection(&connection_id) {
        log::warn!("failed to drop saved queries on delete: {}", e);
    }

    Ok(deleted)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> ConnectionConfigDto {
        ConnectionConfigDto {
            id: None,
            name: "prod".to_string(),
            db_type: "mongodb".to_string(),
            host: "db.local".to_string(),
            port: 27017,
            username: None,
            password: None,
            database: None,
            auth_database: None,
            tls: None,
            ssh: None,
        }
    }

    #[test]
    fn validate_accepts_a_well_formed_config() {
        assert!(valid().validate().is_ok());
    }

    #[test]
    fn validate_rejects_empty_name() {
        let mut c = valid();
        c.name = "   ".to_string();
        let err = c.validate().unwrap_err();
        assert!(err.contains("name"), "got: {}", err);
    }

    #[test]
    fn validate_rejects_empty_host() {
        let mut c = valid();
        c.host = "".to_string();
        let err = c.validate().unwrap_err();
        assert!(err.contains("host"), "got: {}", err);
    }

    #[test]
    fn validate_rejects_port_zero() {
        let mut c = valid();
        c.port = 0;
        let err = c.validate().unwrap_err();
        assert!(err.contains("port"), "got: {}", err);
    }

    #[test]
    fn validate_rejects_unknown_db_type() {
        let mut c = valid();
        c.db_type = "cassandra".to_string();
        let err = c.validate().unwrap_err();
        assert!(err.contains("Unsupported database type"), "got: {}", err);
    }
}
