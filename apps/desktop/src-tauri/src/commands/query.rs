use crate::storage::{NewQueryHistoryEntry, QueryHistoryEntry};
use crate::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::{command, State};

/// Hard ceiling on history page size. Prevents a buggy or malicious
/// frontend from passing `limit: i64::MAX` and pulling the entire
/// table into memory across the IPC boundary in one shot. The history
/// UI renders a virtualised list anyway — anything beyond a few
/// hundred rows is wasted bandwidth.
const HISTORY_LIMIT_MAX: i64 = 1000;
const HISTORY_LIMIT_DEFAULT: i64 = 100;

fn clamp_history_limit(input: Option<i64>) -> i64 {
    let raw = input.unwrap_or(HISTORY_LIMIT_DEFAULT);
    raw.clamp(1, HISTORY_LIMIT_MAX)
}

#[cfg(test)]
mod limit_clamp {
    use super::*;

    #[test]
    fn unset_falls_back_to_default() {
        assert_eq!(clamp_history_limit(None), HISTORY_LIMIT_DEFAULT);
    }

    #[test]
    fn within_range_passes_through() {
        assert_eq!(clamp_history_limit(Some(50)), 50);
    }

    #[test]
    fn over_max_is_clamped() {
        assert_eq!(clamp_history_limit(Some(i64::MAX)), HISTORY_LIMIT_MAX);
    }

    #[test]
    fn zero_or_negative_is_clamped_to_one() {
        assert_eq!(clamp_history_limit(Some(0)), 1);
        assert_eq!(clamp_history_limit(Some(-42)), 1);
    }
}

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

/// Execute a query on a connection.
///
/// Always records a history entry — including for adapter-side failures
/// the previous version silently dropped on the floor. The user runs a
/// malformed query, sees it fail in a toast, and then opens the history
/// panel expecting to find it: the previous code returned `Err(...)`
/// before reaching the `query_history.insert` call, so the failed
/// attempt was invisible. Now the error path builds an `error` history
/// entry first, then propagates the error to the caller.
#[command]
pub async fn execute_query(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: Option<String>,
    query: String,
) -> Result<QueryResultDto, String> {
    // Resolved up front so it is available on both branches below. The
    // history entry needs the language regardless of whether the query
    // succeeded.
    let language = state
        .pool
        .database_type(&connection_id)
        .await
        .map(|t| t.as_str().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let result = state
        .pool
        .execute_query(
            &connection_id,
            &database_name,
            collection_name.as_deref(),
            &query,
        )
        .await;

    match result {
        Ok(result) => {
            let history_entry = NewQueryHistoryEntry {
                connection_id: connection_id.clone(),
                query: query.clone(),
                language,
                database_name: Some(database_name),
                collection_name,
                execution_time_ms: result.execution_time_ms,
                success: result.success,
                result_count: result.documents.len() as u64,
                error: result.error.clone(),
            };
            record_history(&state, &history_entry);

            Ok(QueryResultDto {
                success: result.success,
                documents: result.documents,
                execution_time_ms: result.execution_time_ms,
                documents_affected: result.documents_affected,
                error: result.error,
            })
        }
        Err(e) => {
            let safe_error = crate::redact_error(e.to_string());
            // Record the failed attempt before returning so the history
            // panel keeps a complete log of what the user tried.
            let history_entry = NewQueryHistoryEntry {
                connection_id: connection_id.clone(),
                query: query.clone(),
                language,
                database_name: Some(database_name),
                collection_name,
                execution_time_ms: 0,
                success: false,
                result_count: 0,
                error: Some(safe_error.clone()),
            };
            record_history(&state, &history_entry);
            Err(safe_error)
        }
    }
}

/// Insert a history row, logging on failure instead of dropping silently.
///
/// History is observability data — losing one row should never abort
/// the underlying query (the result is already on its way back to the
/// caller and the user expects it). But a `let _ = ...` swallow makes
/// "history panel mysteriously empty" undebuggable. The two call sites
/// in `execute_query` used to do exactly that; they now share this
/// helper so the rule is enforced in one place.
fn record_history(state: &AppState, entry: &NewQueryHistoryEntry) {
    if let Err(e) = state.query_history.insert(entry) {
        log::warn!(
            "failed to record query history for connection {}: {}",
            entry.connection_id,
            e
        );
    }
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
        .get_by_connection(&connection_id, clamp_history_limit(limit))
        .map_err(|e| crate::redact_error(e.to_string()))?;

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
        .map_err(|e| crate::redact_error(e.to_string()))?;

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
        .map_err(|e| crate::redact_error(e.to_string()))?;

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
        .search(&connection_id, &search_query, clamp_history_limit(limit))
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(entries)
}
