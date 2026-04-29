use crate::adapters::{CollectionInfo, DatabaseInfo};
use crate::{validate_database_name, AppState};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{command, State};

/// Database info for frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseDto {
    pub name: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: Option<u64>,
    #[serde(rename = "collectionCount")]
    pub collection_count: Option<u64>,
}

impl From<DatabaseInfo> for DatabaseDto {
    fn from(info: DatabaseInfo) -> Self {
        Self {
            name: info.name,
            size_bytes: info.size_bytes,
            collection_count: info.collection_count,
        }
    }
}

/// Collection info for frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct CollectionDto {
    pub name: String,
    #[serde(rename = "databaseName")]
    pub database_name: String,
    #[serde(rename = "documentCount")]
    pub document_count: Option<u64>,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: Option<u64>,
}

impl From<CollectionInfo> for CollectionDto {
    fn from(info: CollectionInfo) -> Self {
        Self {
            name: info.name,
            database_name: info.database_name,
            document_count: info.document_count,
            size_bytes: info.size_bytes,
        }
    }
}

/// Get list of databases for a connection
#[command]
pub async fn get_databases(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<Vec<DatabaseDto>, String> {
    let databases = state
        .pool
        .get_databases(&connection_id)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(databases.into_iter().map(DatabaseDto::from).collect())
}

/// Get list of collections in a database
#[command]
pub async fn get_collections(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
) -> Result<Vec<CollectionDto>, String> {
    validate_database_name(&database_name)?;
    let collections = state
        .pool
        .get_collections(&connection_id, &database_name)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(collections.into_iter().map(CollectionDto::from).collect())
}
