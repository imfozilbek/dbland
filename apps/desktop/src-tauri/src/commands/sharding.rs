use crate::{validate_collection_name, validate_database_name, AppState};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShardInfo {
    pub shard_id: String,
    pub host: String,
    pub state: i32,
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShardedCollection {
    pub namespace: String,  // db.collection
    pub shard_key: serde_json::Value,
    pub unique: bool,
    pub balancing: bool,
    pub chunk_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChunkDistribution {
    pub shard_id: String,
    pub chunk_count: i64,
}

/// Get full sharding status
#[tauri::command]
pub async fn get_sharding_status(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    // Use sh.status() equivalent command
    let query = r#"db.adminCommand({ listShards: 1 })"#.to_string();

    let result = state
        .pool
        .execute_query(&connection_id, "admin", None, &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("No sharding status returned".to_string());
    }

    Ok(result.documents[0].clone())
}

/// List all shards
#[tauri::command]
pub async fn list_shards(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<Vec<ShardInfo>, String> {
    let query = r#"db.getSiblingDB("config").shards.find({})"#.to_string();

    let result = state
        .pool
        .execute_query(&connection_id, "config", Some("shards"), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let shards = result
        .documents
        .into_iter()
        .map(|doc| {
            let shard_id = doc
                .get("_id")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();

            let host = doc
                .get("host")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();

            let state = doc.get("state").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

            let tags = doc
                .get("tags")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|t| t.as_str().map(String::from)).collect())
                .unwrap_or_default();

            ShardInfo {
                shard_id,
                host,
                state,
                tags,
            }
        })
        .collect();

    Ok(shards)
}

/// List sharded collections
#[tauri::command]
pub async fn list_sharded_collections(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<Vec<ShardedCollection>, String> {
    let query = r#"db.getSiblingDB("config").collections.find({ dropped: false })"#.to_string();

    let result = state
        .pool
        .execute_query(&connection_id, "config", Some("collections"), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let collections = result
        .documents
        .into_iter()
        .map(|doc| {
            let namespace = doc
                .get("_id")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();

            let shard_key = doc.get("key").cloned().unwrap_or(serde_json::Value::Null);

            let unique = doc
                .get("unique")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            let balancing = doc
                .get("noBalance")
                .and_then(|v| v.as_bool())
                .map(|no_bal| !no_bal)
                .unwrap_or(true);

            // For chunk count, we'd need another query, so default to 0
            let chunk_count = 0;

            ShardedCollection {
                namespace,
                shard_key,
                unique,
                balancing,
                chunk_count,
            }
        })
        .collect();

    Ok(collections)
}

/// Get chunk distribution for a specific collection
#[tauri::command]
pub async fn get_chunk_distribution(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
) -> Result<Vec<ChunkDistribution>, String> {
    validate_database_name(&database_name)?;
    validate_collection_name(&collection_name)?;
    let namespace = format!("{}.{}", database_name, collection_name);
    let query = format!(r#"db.getSiblingDB("config").chunks.find({{ ns: "{}" }})"#, namespace);

    let result = state
        .pool
        .execute_query(&connection_id, "config", Some("chunks"), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    // Count chunks per shard
    let mut distribution: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    for doc in result.documents {
        if let Some(shard) = doc.get("shard").and_then(|v| v.as_str()) {
            *distribution.entry(shard.to_string()).or_insert(0) += 1;
        }
    }

    let chunk_dist: Vec<ChunkDistribution> = distribution
        .into_iter()
        .map(|(shard_id, chunk_count)| ChunkDistribution { shard_id, chunk_count })
        .collect();

    Ok(chunk_dist)
}
