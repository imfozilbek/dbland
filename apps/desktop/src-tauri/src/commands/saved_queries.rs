use crate::storage::{NewSavedQuery, SavedQuery, UpdateSavedQuery};
use crate::AppState;
use std::sync::Arc;
use tauri::{command, State};

/// Reject obviously broken inputs at the IPC boundary so SQLite isn't
/// asked to insert blank rows the user can't even identify in the
/// picker afterwards. Mirrors the validate() pattern on
/// ConnectionConfigDto.
fn validate_new(query: &NewSavedQuery) -> Result<(), String> {
    if query.connection_id.trim().is_empty() {
        return Err("Saved query must reference a connection".to_string());
    }
    if query.name.trim().is_empty() {
        return Err("Saved query name must not be empty".to_string());
    }
    if query.query.trim().is_empty() {
        return Err("Saved query body must not be empty".to_string());
    }
    Ok(())
}

fn validate_update(query: &UpdateSavedQuery) -> Result<(), String> {
    if query.name.trim().is_empty() {
        return Err("Saved query name must not be empty".to_string());
    }
    if query.query.trim().is_empty() {
        return Err("Saved query body must not be empty".to_string());
    }
    Ok(())
}

/// Get saved queries for a connection
#[command]
pub async fn get_saved_queries(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<Vec<SavedQuery>, String> {
    state
        .saved_queries
        .get_by_connection(&connection_id)
        .map_err(|e| crate::redact_error(e.to_string()))
}

/// Save a new query
#[command]
pub async fn save_query(
    state: State<'_, Arc<AppState>>,
    query: NewSavedQuery,
) -> Result<SavedQuery, String> {
    validate_new(&query)?;

    let id = state
        .saved_queries
        .insert(&query)
        .map_err(|e| crate::redact_error(e.to_string()))?;

    // Direct fetch by id — the previous version pulled the entire
    // get_by_connection list (potentially thousands of rows across the
    // IPC boundary) and filtered in memory just to find the one row we
    // knew the id of.
    state
        .saved_queries
        .get_by_id(id)
        .map_err(|e| crate::redact_error(e.to_string()))?
        .ok_or_else(|| "Saved query disappeared between insert and read".to_string())
}

/// Update a saved query
#[command]
pub async fn update_saved_query(
    state: State<'_, Arc<AppState>>,
    query: UpdateSavedQuery,
) -> Result<(), String> {
    validate_update(&query)?;

    state
        .saved_queries
        .update(&query)
        .map_err(|e| crate::redact_error(e.to_string()))
}

/// Delete a saved query
#[command]
pub async fn delete_saved_query(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<(), String> {
    state
        .saved_queries
        .delete(id)
        .map_err(|e| crate::redact_error(e.to_string()))
}

/// Search saved queries by name
#[command]
pub async fn search_saved_queries(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    search_query: String,
) -> Result<Vec<SavedQuery>, String> {
    state
        .saved_queries
        .search_by_name(&connection_id, &search_query)
        .map_err(|e| crate::redact_error(e.to_string()))
}

/// Get saved queries by tag
#[command]
pub async fn get_saved_queries_by_tag(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    tag: String,
) -> Result<Vec<SavedQuery>, String> {
    state
        .saved_queries
        .get_by_tag(&connection_id, &tag)
        .map_err(|e| crate::redact_error(e.to_string()))
}
