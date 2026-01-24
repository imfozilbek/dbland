use crate::AppState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DetailedCollectionStats {
    // Basic stats
    pub count: i64,
    pub size: i64,
    pub avg_obj_size: i64,

    // Index stats
    pub total_index_size: i64,
    pub index_sizes: HashMap<String, i64>,

    // Storage
    pub storage_size: i64,
    pub num_extents: i64,
    pub num_orphan_docs: Option<i64>,

    // Validation
    pub validation_level: Option<String>,
    pub validation_action: Option<String>,

    // Capped
    pub capped: bool,
    pub max: Option<i64>,
    pub max_size: Option<i64>,

    // Sharding
    pub sharded: bool,
    pub shard_distribution: Option<HashMap<String, i64>>,
}

/// Get detailed collection statistics
#[tauri::command]
pub async fn get_detailed_collection_stats(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
) -> Result<DetailedCollectionStats, String> {
    // Use collStats command with verbose option
    let query = format!(r#"db.runCommand({{ "collStats": "{}", "verbose": true }})"#, collection_name);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, None, &query)
        .await
        .map_err(|e| e.to_string())?;

    if result.documents.is_empty() {
        return Err("No stats returned".to_string());
    }

    let stats = &result.documents[0];

    // Parse basic stats
    let count = stats
        .get("count")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let size = stats
        .get("size")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let avg_obj_size = stats
        .get("avgObjSize")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    // Parse index stats
    let total_index_size = stats
        .get("totalIndexSize")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let index_sizes = stats
        .get("indexSizes")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_i64().map(|size| (k.clone(), size)))
                .collect()
        })
        .unwrap_or_default();

    // Parse storage stats
    let storage_size = stats
        .get("storageSize")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let num_extents = stats
        .get("numExtents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let num_orphan_docs = stats
        .get("numOrphanDocs")
        .and_then(|v| v.as_i64());

    // Parse validation
    let validation_level = stats
        .get("validationLevel")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let validation_action = stats
        .get("validationAction")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Parse capped collection info
    let capped = stats
        .get("capped")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let max = stats
        .get("max")
        .and_then(|v| v.as_i64());

    let max_size = stats
        .get("maxSize")
        .and_then(|v| v.as_i64());

    // Parse sharding info
    let sharded = stats
        .get("sharded")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let shard_distribution = if sharded {
        stats
            .get("shards")
            .and_then(|v| v.as_object())
            .map(|obj| {
                obj.iter()
                    .filter_map(|(k, v)| {
                        v.as_object()
                            .and_then(|shard| shard.get("count"))
                            .and_then(|count| count.as_i64())
                            .map(|count| (k.clone(), count))
                    })
                    .collect()
            })
    } else {
        None
    };

    Ok(DetailedCollectionStats {
        count,
        size,
        avg_obj_size,
        total_index_size,
        index_sizes,
        storage_size,
        num_extents,
        num_orphan_docs,
        validation_level,
        validation_action,
        capped,
        max,
        max_size,
        sharded,
        shard_distribution,
    })
}
