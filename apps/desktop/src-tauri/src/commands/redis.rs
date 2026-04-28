use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanKeysRequest {
    pub connection_id: String,
    pub pattern: String,
    pub count: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanKeysResult {
    pub keys: Vec<String>,
    pub cursor: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetValueRequest {
    pub connection_id: String,
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum RedisValue {
    String { value: String },
    List { values: Vec<String> },
    Set { values: Vec<String> },
    ZSet { values: Vec<(String, f64)> },
    Hash { fields: Vec<(String, String)> },
    None,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetValueResult {
    pub value: RedisValue,
    pub ttl: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetTTLRequest {
    pub connection_id: String,
    pub key: String,
    pub seconds: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlowLogEntry {
    pub id: i64,
    pub timestamp: i64,
    pub duration_micros: i64,
    pub command: Vec<String>,
}

/// Scan Redis keys with pattern matching
#[command]
pub async fn redis_scan_keys(
    state: State<'_, Arc<AppState>>,
    request: ScanKeysRequest,
) -> Result<ScanKeysResult, String> {
    // Execute SCAN command
    let result = state
        .pool
        .execute_query(
            &request.connection_id,
            "0",
            None,
            &format!(
                "SCAN 0 MATCH {} COUNT {}",
                request.pattern,
                request.count.unwrap_or(100)
            ),
        )
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    // Parse result
    let keys: Vec<String> = result
        .documents
        .iter()
        .filter_map(|doc| doc.get("key").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();

    Ok(ScanKeysResult {
        keys,
        cursor: 0,
    })
}

/// Get Redis value by key
#[command]
pub async fn redis_get_value(
    state: State<'_, Arc<AppState>>,
    request: GetValueRequest,
) -> Result<GetValueResult, String> {
    // Get key type
    let type_result = state
        .pool
        .execute_query(&request.connection_id, "0", None, &format!("TYPE {}", request.key))
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let key_type = type_result
        .documents
        .first()
        .and_then(|doc| doc.get("type").and_then(|v| v.as_str()))
        .unwrap_or("none");

    // Get TTL
    let ttl_result = state
        .pool
        .execute_query(&request.connection_id, "0", None, &format!("TTL {}", request.key))
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let ttl = ttl_result
        .documents
        .first()
        .and_then(|doc| doc.get("ttl").and_then(|v| v.as_i64()));

    // Get value based on type
    let value = match key_type {
        "string" => {
            let result = state
                .pool
                .execute_query(&request.connection_id, "0", None, &format!("GET {}", request.key))
                .await
                .map_err(|e| crate::redact_error(e.to_string()))?;

            let string_value = result
                .documents
                .first()
                .and_then(|doc| doc.get("value").and_then(|v| v.as_str()))
                .unwrap_or("")
                .to_string();

            RedisValue::String { value: string_value }
        }
        "list" => {
            let result = state
                .pool
                .execute_query(&request.connection_id, "0", None, &format!("LRANGE {} 0 -1", request.key))
                .await
                .map_err(|e| crate::redact_error(e.to_string()))?;

            let values: Vec<String> = result
                .documents
                .iter()
                .filter_map(|doc| doc.get("value").and_then(|v| v.as_str()).map(|s| s.to_string()))
                .collect();

            RedisValue::List { values }
        }
        "set" => {
            let result = state
                .pool
                .execute_query(&request.connection_id, "0", None, &format!("SMEMBERS {}", request.key))
                .await
                .map_err(|e| crate::redact_error(e.to_string()))?;

            let values: Vec<String> = result
                .documents
                .iter()
                .filter_map(|doc| doc.get("value").and_then(|v| v.as_str()).map(|s| s.to_string()))
                .collect();

            RedisValue::Set { values }
        }
        "zset" => {
            let result = state
                .pool
                .execute_query(&request.connection_id, "0", None, &format!("ZRANGE {} 0 -1 WITHSCORES", request.key))
                .await
                .map_err(|e| crate::redact_error(e.to_string()))?;

            let values: Vec<(String, f64)> = result
                .documents
                .chunks(2)
                .filter_map(|chunk| {
                    if chunk.len() == 2 {
                        let member = chunk[0].get("value").and_then(|v| v.as_str())?;
                        let score = chunk[1].get("score").and_then(|v| v.as_f64())?;
                        Some((member.to_string(), score))
                    } else {
                        None
                    }
                })
                .collect();

            RedisValue::ZSet { values }
        }
        "hash" => {
            let result = state
                .pool
                .execute_query(&request.connection_id, "0", None, &format!("HGETALL {}", request.key))
                .await
                .map_err(|e| crate::redact_error(e.to_string()))?;

            let fields: Vec<(String, String)> = result
                .documents
                .chunks(2)
                .filter_map(|chunk| {
                    if chunk.len() == 2 {
                        let field = chunk[0].get("field").and_then(|v| v.as_str())?;
                        let value = chunk[1].get("value").and_then(|v| v.as_str())?;
                        Some((field.to_string(), value.to_string()))
                    } else {
                        None
                    }
                })
                .collect();

            RedisValue::Hash { fields }
        }
        _ => RedisValue::None,
    };

    Ok(GetValueResult { value, ttl })
}

/// Set TTL for a Redis key
#[command]
pub async fn redis_set_ttl(
    state: State<'_, Arc<AppState>>,
    request: SetTTLRequest,
) -> Result<bool, String> {
    // Set TTL
    state
        .pool
        .execute_query(
            &request.connection_id,
            "0",
            None,
            &format!("EXPIRE {} {}", request.key, request.seconds),
        )
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(true)
}

/// Get Redis slow log entries
#[command]
pub async fn redis_slow_log(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    count: Option<usize>,
) -> Result<Vec<SlowLogEntry>, String> {
    // Get slow log
    let result = state
        .pool
        .execute_query(&connection_id, "0", None, &format!("SLOWLOG GET {}", count.unwrap_or(10)))
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    // Parse slow log entries
    let entries: Vec<SlowLogEntry> = result
        .documents
        .iter()
        .filter_map(|doc| {
            Some(SlowLogEntry {
                id: doc.get("id").and_then(|v| v.as_i64())?,
                timestamp: doc.get("timestamp").and_then(|v| v.as_i64())?,
                duration_micros: doc.get("duration").and_then(|v| v.as_i64())?,
                command: doc
                    .get("command")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect()
                    })?,
            })
        })
        .collect();

    Ok(entries)
}
