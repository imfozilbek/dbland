mod adapters;
mod commands;
mod state;
mod storage;

use state::ConnectionPool;
use storage::{ConnectionStorage, Crypto, QueryHistoryStorage, SavedQueriesStorage};
use std::sync::Arc;
use tauri::Manager;

/// Application state shared across commands
pub struct AppState {
    pub pool: ConnectionPool,
    pub storage: ConnectionStorage,
    pub query_history: QueryHistoryStorage,
    pub saved_queries: SavedQueriesStorage,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Get app data directory for storage
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            // Generate or load encryption key
            let key_path = app_data_dir.join(".key");
            let key = if key_path.exists() {
                let key_data = std::fs::read(&key_path).expect("Failed to read encryption key");
                let mut key = [0u8; 32];
                key.copy_from_slice(&key_data[..32]);
                key
            } else {
                let key = Crypto::generate_key();
                std::fs::write(&key_path, &key).expect("Failed to save encryption key");
                key
            };

            // Initialize storage
            let db_path = app_data_dir.join("connections.db");
            let storage = ConnectionStorage::new(db_path, &key)
                .expect("Failed to initialize connection storage");

            // Initialize query history storage
            let history_db_path = app_data_dir.join("query_history.db");
            let query_history = QueryHistoryStorage::new(history_db_path)
                .expect("Failed to initialize query history storage");

            // Initialize saved queries storage
            let saved_queries_db_path = app_data_dir.join("saved_queries.db");
            let saved_queries = SavedQueriesStorage::new(saved_queries_db_path)
                .expect("Failed to initialize saved queries storage");

            // Initialize connection pool
            let pool = ConnectionPool::new();

            // Create app state
            let state = AppState {
                pool,
                storage,
                query_history,
                saved_queries,
            };
            app.manage(Arc::new(state));

            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connection::test_connection,
            commands::connection::connect,
            commands::connection::disconnect,
            commands::connection::get_connections,
            commands::connection::save_connection,
            commands::connection::delete_connection,
            commands::schema::get_databases,
            commands::schema::get_collections,
            commands::query::execute_query,
            commands::query::get_query_history,
            commands::query::delete_query_history,
            commands::query::clear_query_history,
            commands::query::search_query_history,
            commands::saved_queries::get_saved_queries,
            commands::saved_queries::save_query,
            commands::saved_queries::update_saved_query,
            commands::saved_queries::delete_saved_query,
            commands::saved_queries::search_saved_queries,
            commands::saved_queries::get_saved_queries_by_tag,
            commands::document::get_document,
            commands::document::update_document,
            commands::document::delete_document,
            commands::document::clone_document,
            commands::import_export::import_data,
            commands::import_export::export_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
