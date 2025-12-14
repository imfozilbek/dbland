use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfig {
    pub id: Option<String>,
    pub name: String,
    pub r#type: String, // "mongodb" or "redis"
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub ssh_enabled: Option<bool>,
    pub ssh_host: Option<String>,
    pub ssh_port: Option<u16>,
    pub ssh_username: Option<String>,
    pub ssh_password: Option<String>,
    pub ssh_key_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub host: String,
    pub port: u16,
    pub status: String, // "connected", "disconnected", "error"
    pub last_connected_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
}

/// Test a database connection without fully connecting
#[command]
pub async fn test_connection(config: ConnectionConfig) -> Result<TestConnectionResult, String> {
    let start = std::time::Instant::now();

    match config.r#type.as_str() {
        "mongodb" => {
            // Build connection string
            let mut uri = String::from("mongodb://");
            if let (Some(username), Some(password)) = (&config.username, &config.password) {
                uri.push_str(&format!("{}:{}@", username, password));
            }
            uri.push_str(&format!("{}:{}", config.host, config.port));

            match mongodb::Client::with_uri_str(&uri).await {
                Ok(client) => {
                    // Try to ping the server
                    match client
                        .database("admin")
                        .run_command(mongodb::bson::doc! { "ping": 1 })
                        .await
                    {
                        Ok(_) => Ok(TestConnectionResult {
                            success: true,
                            message: "Connection successful".to_string(),
                            latency_ms: Some(start.elapsed().as_millis() as u64),
                        }),
                        Err(e) => Ok(TestConnectionResult {
                            success: false,
                            message: format!("Ping failed: {}", e),
                            latency_ms: None,
                        }),
                    }
                }
                Err(e) => Ok(TestConnectionResult {
                    success: false,
                    message: format!("Connection failed: {}", e),
                    latency_ms: None,
                }),
            }
        }
        "redis" => {
            let url = if let Some(password) = &config.password {
                format!("redis://:{}@{}:{}", password, config.host, config.port)
            } else {
                format!("redis://{}:{}", config.host, config.port)
            };

            match redis::Client::open(url) {
                Ok(client) => match client.get_multiplexed_tokio_connection().await {
                    Ok(mut conn) => {
                        let result: Result<String, _> = redis::cmd("PING")
                            .query_async(&mut conn)
                            .await;

                        match result {
                            Ok(_) => Ok(TestConnectionResult {
                                success: true,
                                message: "Connection successful".to_string(),
                                latency_ms: Some(start.elapsed().as_millis() as u64),
                            }),
                            Err(e) => Ok(TestConnectionResult {
                                success: false,
                                message: format!("Ping failed: {}", e),
                                latency_ms: None,
                            }),
                        }
                    }
                    Err(e) => Ok(TestConnectionResult {
                        success: false,
                        message: format!("Connection failed: {}", e),
                        latency_ms: None,
                    }),
                },
                Err(e) => Ok(TestConnectionResult {
                    success: false,
                    message: format!("Invalid URL: {}", e),
                    latency_ms: None,
                }),
            }
        }
        _ => Err(format!("Unsupported database type: {}", config.r#type)),
    }
}

/// Connect to a database
#[command]
pub async fn connect(connection_id: String) -> Result<bool, String> {
    // TODO: Implement actual connection management
    // For now, just return success
    Ok(true)
}

/// Disconnect from a database
#[command]
pub async fn disconnect(connection_id: String) -> Result<bool, String> {
    // TODO: Implement actual disconnection
    Ok(true)
}

/// Get all saved connections
#[command]
pub async fn get_connections() -> Result<Vec<Connection>, String> {
    // TODO: Load from SQLite storage
    // For now, return empty list
    Ok(vec![])
}

/// Save a connection configuration
#[command]
pub async fn save_connection(config: ConnectionConfig) -> Result<Connection, String> {
    let id = config.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // TODO: Save to SQLite storage with encrypted credentials

    Ok(Connection {
        id,
        name: config.name,
        r#type: config.r#type,
        host: config.host,
        port: config.port,
        status: "disconnected".to_string(),
        last_connected_at: None,
    })
}

/// Delete a connection
#[command]
pub async fn delete_connection(connection_id: String) -> Result<bool, String> {
    // TODO: Delete from SQLite storage
    Ok(true)
}
