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

    Ok(QueryResultDto {
        success: result.success,
        documents: result.documents,
        execution_time_ms: result.execution_time_ms,
        documents_affected: result.documents_affected,
        error: result.error,
    })
}
