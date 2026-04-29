use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplicaSetMember {
    pub name: String,
    pub state_str: String,  // PRIMARY, SECONDARY, ARBITER, etc.
    pub health: i32,
    pub uptime: i64,
    pub optime_date: String,
    pub last_heartbeat: Option<String>,
    pub ping_ms: Option<i64>,
    pub sync_source_host: Option<String>,
    pub config_version: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplicaSetStatus {
    pub set_name: String,
    pub date: String,
    pub my_state: i32,
    pub members: Vec<ReplicaSetMember>,
    pub ok: i32,
}

/// Get replica set status
#[tauri::command]
pub async fn get_replica_set_status(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<ReplicaSetStatus, String> {
    // Run replSetGetStatus command on admin database
    let query = r#"db.adminCommand({ replSetGetStatus: 1 })"#.to_string();

    let result = state
        .pool
        .execute_query(&connection_id, "admin", None, &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("No replica set status returned".to_string());
    }

    let status = &result.documents[0];

    // Parse set name
    let set_name = status
        .get("set")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    // Parse date
    let date = status
        .get("date")
        .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
        .unwrap_or("")
        .to_string();

    // Parse my state
    let my_state = status
        .get("myState")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;

    // Parse ok status
    let ok = status
        .get("ok")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;

    // Parse members
    let members = status
        .get("members")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .map(|member| {
                    let name = member
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();

                    let state_str = member
                        .get("stateStr")
                        .and_then(|v| v.as_str())
                        .unwrap_or("UNKNOWN")
                        .to_string();

                    let health = member
                        .get("health")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32;

                    let uptime = member.get("uptime").and_then(|v| v.as_i64()).unwrap_or(0);

                    let optime_date = member
                        .get("optimeDate")
                        .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
                        .unwrap_or("")
                        .to_string();

                    let last_heartbeat = member
                        .get("lastHeartbeat")
                        .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
                        .map(String::from);

                    let ping_ms = member.get("pingMs").and_then(|v| v.as_i64());

                    let sync_source_host = member
                        .get("syncSourceHost")
                        .and_then(|v| v.as_str())
                        .map(String::from);

                    let config_version = member
                        .get("configVersion")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0) as i32;

                    ReplicaSetMember {
                        name,
                        state_str,
                        health,
                        uptime,
                        optime_date,
                        last_heartbeat,
                        ping_ms,
                        sync_source_host,
                        config_version,
                    }
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(ReplicaSetStatus {
        set_name,
        date,
        my_state,
        members,
        ok,
    })
}

/// Get replica set configuration
#[tauri::command]
pub async fn get_replica_set_config(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    // Run replSetGetConfig command on admin database
    let query = r#"db.adminCommand({ replSetGetConfig: 1 })"#.to_string();

    let result = state
        .pool
        .execute_query(&connection_id, "admin", None, &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("No replica set config returned".to_string());
    }

    // Return the config document as-is
    Ok(result.documents[0].clone())
}
