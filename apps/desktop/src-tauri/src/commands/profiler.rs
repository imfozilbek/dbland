use crate::AppState;
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProfilerLevelDto {
    pub level: i32,
    pub slow_ms: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProfilerEntry {
    pub ts: String,
    pub op: String,
    pub ns: String,
    pub command: serde_json::Value,
    pub millis: i64,
    pub num_yield: i64,
    pub response_length: i64,
}

/// Get the current profiler level for a database
#[tauri::command]
pub async fn get_profiler_level(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
) -> Result<ProfilerLevelDto, String> {
    // Use execute_query to run the profile command
    let query = format!(r#"db.runCommand({{ "profile": -1 }})"#);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, None, &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("No result from profiler command".to_string());
    }

    let doc = &result.documents[0];
    let level = doc
        .get("was")
        .and_then(|v| v.as_i64())
        .ok_or("Failed to get profiler level from response")?
        as i32;

    let slow_ms = doc
        .get("slowms")
        .and_then(|v| v.as_i64());

    Ok(ProfilerLevelDto { level, slow_ms })
}

/// Set the profiler level for a database
/// Level: 0 = off, 1 = slow operations only, 2 = all operations
#[tauri::command]
pub async fn set_profiler_level(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    level: i32,
    slow_ms: Option<i64>,
) -> Result<(), String> {
    if level < 0 || level > 2 {
        return Err("Profiler level must be 0, 1, or 2".to_string());
    }

    let slow_ms_param = if let Some(ms) = slow_ms {
        format!(r#", "slowms": {}"#, ms)
    } else {
        String::new()
    };

    let query = format!(r#"db.runCommand({{ "profile": {}{} }})"#, level, slow_ms_param);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, None, &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.success {
        Ok(())
    } else {
        Err(result.error.unwrap_or_else(|| "Failed to set profiler level".to_string()))
    }
}

/// Get profiler data (query system.profile collection)
#[tauri::command]
pub async fn get_profiler_data(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    limit: Option<i64>,
) -> Result<Vec<ProfilerEntry>, String> {
    let limit_value = limit.unwrap_or(100);

    // Query the system.profile collection
    let query = format!(
        r#"db.system.profile.find({{}}).sort({{ ts: -1 }}).limit({})"#,
        limit_value
    );

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some("system.profile"), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let mut entries = Vec::new();

    for doc in result.documents {
        let ts = doc
            .get("ts")
            .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
            .unwrap_or("")
            .to_string();

        let op = doc
            .get("op")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let ns = doc
            .get("ns")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let command = doc
            .get("command")
            .cloned()
            .unwrap_or(serde_json::Value::Null);

        let millis = doc
            .get("millis")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        let num_yield = doc
            .get("numYield")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        let response_length = doc
            .get("responseLength")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        entries.push(ProfilerEntry {
            ts,
            op,
            ns,
            command,
            millis,
            num_yield,
            response_length,
        });
    }

    Ok(entries)
}

/// Clear profiler data by dropping the system.profile collection
#[tauri::command]
pub async fn clear_profiler_data(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
) -> Result<(), String> {
    let query = "db.system.profile.drop()".to_string();

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some("system.profile"), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.success {
        Ok(())
    } else {
        Err(result.error.unwrap_or_else(|| "Failed to clear profiler data".to_string()))
    }
}
