use crate::storage::{NewSavedQuery, SavedQuery, UpdateSavedQuery};
use crate::AppState;
use std::sync::Arc;
use tauri::{command, State};

/// Get saved queries for a connection
#[command]
pub async fn get_saved_queries(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<Vec<SavedQuery>, String> {
    state
        .saved_queries
        .get_by_connection(&connection_id)
        .map_err(|e| e.to_string())
}

/// Save a new query
#[command]
pub async fn save_query(
    state: State<'_, Arc<AppState>>,
    query: NewSavedQuery,
) -> Result<SavedQuery, String> {
    let id = state
        .saved_queries
        .insert(&query)
        .map_err(|e| e.to_string())?;

    // Get the saved query
    let queries = state
        .saved_queries
        .get_by_connection(&query.connection_id)
        .map_err(|e| e.to_string())?;

    queries
        .into_iter()
        .find(|q| q.id == id)
        .ok_or_else(|| "Failed to retrieve saved query".to_string())
}

/// Update a saved query
#[command]
pub async fn update_saved_query(
    state: State<'_, Arc<AppState>>,
    query: UpdateSavedQuery,
) -> Result<(), String> {
    state
        .saved_queries
        .update(&query)
        .map_err(|e| e.to_string())
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
        .map_err(|e| e.to_string())
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
        .map_err(|e| e.to_string())
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
        .map_err(|e| e.to_string())
}
