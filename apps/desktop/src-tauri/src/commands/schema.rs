use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct Database {
    pub name: String,
    pub size_bytes: Option<u64>,
    pub collection_count: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Collection {
    pub name: String,
    pub database_name: String,
    pub document_count: Option<u64>,
    pub size_bytes: Option<u64>,
}

/// Get list of databases
#[command]
pub async fn get_databases(connection_id: String) -> Result<Vec<Database>, String> {
    // TODO: Get from active connection
    // For now, return mock data
    Ok(vec![
        Database {
            name: "admin".to_string(),
            size_bytes: Some(32768),
            collection_count: Some(1),
        },
        Database {
            name: "local".to_string(),
            size_bytes: Some(65536),
            collection_count: Some(2),
        },
        Database {
            name: "test".to_string(),
            size_bytes: Some(0),
            collection_count: Some(0),
        },
    ])
}

/// Get list of collections in a database
#[command]
pub async fn get_collections(
    connection_id: String,
    database_name: String,
) -> Result<Vec<Collection>, String> {
    // TODO: Get from active connection
    // For now, return mock data
    Ok(vec![
        Collection {
            name: "users".to_string(),
            database_name: database_name.clone(),
            document_count: Some(100),
            size_bytes: Some(16384),
        },
        Collection {
            name: "orders".to_string(),
            database_name,
            document_count: Some(500),
            size_bytes: Some(81920),
        },
    ])
}
