mod adapters;
mod commands;
mod state;
mod storage;
mod tunnel;

use state::ConnectionPool;
use storage::{ConnectionStorage, Crypto, QueryHistoryStorage, SavedQueriesStorage};
use std::path::Path;
use std::sync::Arc;
use tauri::Manager;

/// Keychain identifiers — kept stable to preserve the migrated key across
/// app restarts. Service is the bundle id, account name labels the secret.
const KEYRING_SERVICE: &str = "com.dbland.app";
const KEYRING_ACCOUNT: &str = "master-key";

/// Application state shared across commands
pub struct AppState {
    pub pool: ConnectionPool,
    pub storage: ConnectionStorage,
    pub query_history: QueryHistoryStorage,
    pub saved_queries: SavedQueriesStorage,
}

/// Load or create the master encryption key.
///
/// Priority: OS keychain → legacy `.key` file (one-shot migration) → freshly generated.
/// After a successful migration the legacy file is wiped so the key never sits on disk again.
fn load_or_create_master_key(app_data_dir: &Path) -> [u8; 32] {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .expect("Failed to construct keyring entry");

    // 1. Already in keychain — decode and return.
    if let Ok(stored) = entry.get_password() {
        if let Some(key) = decode_master_key(&stored) {
            return key;
        }
        log::warn!("master key in keychain has invalid format; regenerating");
    }

    // 2. Legacy file from pre-1.1.0 builds — migrate then delete.
    let legacy_path = app_data_dir.join(".key");
    if legacy_path.exists() {
        if let Ok(data) = std::fs::read(&legacy_path) {
            if data.len() >= 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&data[..32]);
                if entry
                    .set_password(&encode_master_key(&key))
                    .is_ok()
                {
                    let _ = std::fs::remove_file(&legacy_path);
                    log::info!("master key migrated from legacy file to OS keychain");
                    return key;
                }
                log::error!("failed to write master key to keychain — keeping legacy file");
                return key;
            }
        }
    }

    // 3. Fresh install — generate and persist.
    let key = Crypto::generate_key();
    entry
        .set_password(&encode_master_key(&key))
        .expect("Failed to store master key in OS keychain");
    log::info!("generated new master key and stored in OS keychain");
    key
}

/// Encode a 32-byte key as a hex string for keychain storage.
fn encode_master_key(key: &[u8; 32]) -> String {
    let mut s = String::with_capacity(64);
    for byte in key {
        s.push_str(&format!("{:02x}", byte));
    }
    s
}

/// Decode a hex string back into a 32-byte key. Returns `None` on any malformation.
fn decode_master_key(s: &str) -> Option<[u8; 32]> {
    if s.len() != 64 {
        return None;
    }
    let mut key = [0u8; 32];
    for (i, byte) in key.iter_mut().enumerate() {
        let chunk = &s[i * 2..i * 2 + 2];
        *byte = u8::from_str_radix(chunk, 16).ok()?;
    }
    Some(key)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialise structured logging — silent unless RUST_LOG is set,
    // so production releases don't spew to stderr.
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Get app data directory for storage
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            // Master key now lives in the OS keychain (migrated from `.key` if present).
            let key = load_or_create_master_key(&app_data_dir);

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
            commands::aggregation::execute_aggregation_pipeline,
            commands::aggregation::preview_pipeline_stage,
            commands::indexes::get_indexes,
            commands::indexes::create_index,
            commands::indexes::drop_index,
            commands::indexes::get_index_stats,
            commands::profiler::get_profiler_level,
            commands::profiler::set_profiler_level,
            commands::profiler::get_profiler_data,
            commands::profiler::clear_profiler_data,
            commands::collection_stats::get_detailed_collection_stats,
            commands::geospatial::execute_geospatial_query,
            commands::gridfs::list_gridfs_files,
            commands::gridfs::get_gridfs_file_metadata,
            commands::gridfs::delete_gridfs_file,
            commands::gridfs::download_gridfs_file,
            commands::replica_set::get_replica_set_status,
            commands::replica_set::get_replica_set_config,
            commands::sharding::get_sharding_status,
            commands::sharding::list_shards,
            commands::sharding::list_sharded_collections,
            commands::sharding::get_chunk_distribution,
            commands::redis::redis_scan_keys,
            commands::redis::redis_get_value,
            commands::redis::redis_set_ttl,
            commands::redis::redis_slow_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
