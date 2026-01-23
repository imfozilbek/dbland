use crate::storage::{NewQueryHistoryEntry, QueryHistoryEntry};
use crate::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::{command, State};

/// Query execution result for frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResultDto {
    pub success: bool,
    pub documents: Vec<Value>,
    #[serde(rename = "executionTimeMs")]
    pub execution_time_ms: u64,
    #[serde(rename = "documentsAffected")]
    pub documents_affected: u64,
    pub error: Option<String>,
}

/// Execute a query on a connection
#[command]
pub async fn execute_query(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: Option<String>,
    query: String,
) -> Result<QueryResultDto, String> {
    let result = state
        .pool
        .execute_query(
            &connection_id,
            &database_name,
            collection_name.as_deref(),
            &query,
        )
        .await
        .map_err(|e| e.to_string())?;

    // Save to query history
    let history_entry = NewQueryHistoryEntry {
        connection_id: connection_id.clone(),
        query: query.clone(),
        language: "mongodb".to_string(), // TODO: detect language
        database_name: Some(database_name),
        collection_name,
        execution_time_ms: result.execution_time_ms,
        success: result.success,
        result_count: result.documents.len() as u64,
        error: result.error.clone(),
    };

    let _ = state.query_history.insert(&history_entry);

    Ok(QueryResultDto {
        success: result.success,
        documents: result.documents,
        execution_time_ms: result.execution_time_ms,
        documents_affected: result.documents_affected,
        error: result.error,
    })
}

/// Get query history for a connection
#[command]
pub async fn get_query_history(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    limit: Option<i64>,
) -> Result<Vec<QueryHistoryEntry>, String> {
    let entries = state
        .query_history
        .get_by_connection(&connection_id, limit.unwrap_or(100))
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

/// Delete a query history entry
#[command]
pub async fn delete_query_history(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<(), String> {
    state
        .query_history
        .delete(id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear query history for a connection
#[command]
pub async fn clear_query_history(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<(), String> {
    state
        .query_history
        .clear_by_connection(&connection_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Search query history
#[command]
pub async fn search_query_history(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    search_query: String,
    limit: Option<i64>,
) -> Result<Vec<QueryHistoryEntry>, String> {
    let entries = state
        .query_history
        .search(&connection_id, &search_query, limit.unwrap_or(100))
        .map_err(|e| e.to_string())?;

    Ok(entries)
}
