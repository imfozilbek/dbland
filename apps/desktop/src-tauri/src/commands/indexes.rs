use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Index {
    pub name: String,
    pub keys: serde_json::Value,
    pub unique: bool,
    pub sparse: bool,
    pub ttl: Option<i64>,
    pub background: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIndexRequest {
    pub connection_id: String,
    pub database_name: String,
    pub collection_name: String,
    pub keys: serde_json::Value,
    pub unique: Option<bool>,
    pub sparse: Option<bool>,
    pub ttl_seconds: Option<i64>,
    pub background: Option<bool>,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    pub name: String,
    pub accesses: Option<i64>,
    pub since: Option<String>,
}

#[tauri::command]
pub async fn get_indexes(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
) -> Result<Vec<Index>, String> {
    let query = format!("db.{}.getIndexes()", collection_name);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| format!("Failed to get indexes: {:?}", e))?;

    let indexes: Vec<Index> = result
        .documents
        .into_iter()
        .filter_map(|doc| {
            let name = doc.get("name")?.as_str()?.to_string();
            let keys = doc.get("key")?.clone();
            let unique = doc.get("unique").and_then(|v| v.as_bool()).unwrap_or(false);
            let sparse = doc.get("sparse").and_then(|v| v.as_bool()).unwrap_or(false);
            let ttl = doc
                .get("expireAfterSeconds")
                .and_then(|v| v.as_i64());
            let background = doc
                .get("background")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            Some(Index {
                name,
                keys,
                unique,
                sparse,
                ttl,
                background,
            })
        })
        .collect();

    Ok(indexes)
}

#[tauri::command]
pub async fn create_index(
    state: State<'_, Arc<AppState>>,
    request: CreateIndexRequest,
) -> Result<String, String> {
    let keys_str = serde_json::to_string(&request.keys)
        .map_err(|e| format!("Failed to serialize keys: {}", e))?;

    let mut options: Vec<String> = Vec::new();

    if let Some(true) = request.unique {
        options.push("unique: true".to_string());
    }
    if let Some(true) = request.sparse {
        options.push("sparse: true".to_string());
    }
    if let Some(ttl) = request.ttl_seconds {
        options.push(format!("expireAfterSeconds: {}", ttl));
    }
    if let Some(true) = request.background {
        options.push("background: true".to_string());
    }
    if let Some(ref name) = request.name {
        options.push(format!("name: \"{}\"", name));
    }

    let options_str = if options.is_empty() {
        String::new()
    } else {
        format!(", {{{}}}", options.join(", "))
    };

    let query = format!(
        "db.{}.createIndex({} {})",
        request.collection_name, keys_str, options_str
    );

    let result = state
        .pool
        .execute_query(&request.connection_id, &request.database_name, Some(&request.collection_name), &query)
        .await
        .map_err(|e| format!("Failed to create index: {:?}", e))?;

    if result.success {
        Ok(request.name.unwrap_or_else(|| "index".to_string()))
    } else {
        Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
    }
}

#[tauri::command]
pub async fn drop_index(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
    index_name: String,
) -> Result<bool, String> {
    let query = format!("db.{}.dropIndex(\"{}\")", collection_name, index_name);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| format!("Failed to drop index: {:?}", e))?;

    Ok(result.success)
}

#[tauri::command]
pub async fn get_index_stats(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
) -> Result<Vec<IndexStats>, String> {
    let query = format!("db.{}.aggregate([{{$indexStats: {{}}}}])", collection_name);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| format!("Failed to get index stats: {:?}", e))?;

    let stats: Vec<IndexStats> = result
        .documents
        .into_iter()
        .filter_map(|doc| {
            let name = doc.get("name")?.as_str()?.to_string();
            let accesses_obj = doc.get("accesses")?;
            let accesses = accesses_obj.get("ops").and_then(|v| v.as_i64());
            let since = accesses_obj
                .get("since")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            Some(IndexStats {
                name,
                accesses,
                since,
            })
        })
        .collect();

    Ok(stats)
}
