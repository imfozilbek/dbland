mod adapters;
mod commands;
mod error;
mod state;
mod storage;
mod tunnel;
mod validation;

// Re-export the IPC redactor so command handlers can pull it from a
// stable path. Keeps `mod error` private; callers see `crate::redact_error`.
pub(crate) use error::redact_error;
pub(crate) use validation::{
    clamp_query_limit, validate_collection_name, validate_database_name, validate_object_id,
};

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
///
/// Returns `Err` if the OS keychain is unreachable (locked Linux Secret Service,
/// missing keychain on headless CI, etc.). The caller should surface this through
/// Tauri's setup-error path rather than panic — without the master key we cannot
/// decrypt stored credentials, so refusing to start is the only safe outcome.
fn load_or_create_master_key(
    app_data_dir: &Path,
) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|e| -> Box<dyn std::error::Error> {
            Box::from(format!("failed to construct OS keychain entry: {e}"))
        })?;

    // 1. Already in keychain — decode and return.
    if let Ok(stored) = entry.get_password() {
        if let Some(key) = decode_master_key(&stored) {
            return Ok(key);
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
                if entry.set_password(&encode_master_key(&key)).is_ok() {
                    // The keychain copy is now authoritative; the
                    // on-disk file is a duplicate of the master key
                    // sitting in the user's home dir. If we can't
                    // delete it, log loudly — leaving a key file behind
                    // is a security regression even though the
                    // migration itself succeeded.
                    if let Err(e) = std::fs::remove_file(&legacy_path) {
                        log::error!(
                            "master key migrated to keychain but legacy key file at {} could not be removed: {} \
                             — delete it manually to avoid keeping the secret on disk",
                            legacy_path.display(),
                            e
                        );
                    }
                    log::info!("master key migrated from legacy file to OS keychain");
                    return Ok(key);
                }
                log::error!("failed to write master key to keychain — keeping legacy file");
                return Ok(key);
            }
        }
    }

    // 3. Fresh install — generate and persist.
    let key = Crypto::generate_key();
    entry
        .set_password(&encode_master_key(&key))
        .map_err(|e| -> Box<dyn std::error::Error> {
            Box::from(format!("failed to store master key in OS keychain: {e}"))
        })?;
    log::info!("generated new master key and stored in OS keychain");
    Ok(key)
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
///
/// Operates on the byte view, not the `&str` view. The previous version
/// sliced `&s[i * 2..i * 2 + 2]` after only checking `s.len() == 64` —
/// `len` counts bytes, so a 64-byte string with a multi-byte UTF-8
/// character anywhere in it would let the length check pass and then
/// panic at the slice (slicing inside a UTF-8 codepoint is a runtime
/// abort). A user (or attacker) seeding the keychain with garbage
/// would then crash the app at startup with no recourse.
fn decode_master_key(s: &str) -> Option<[u8; 32]> {
    let bytes = s.as_bytes();
    if bytes.len() != 64 {
        return None;
    }
    let mut key = [0u8; 32];
    for (i, slot) in key.iter_mut().enumerate() {
        let high = hex_value(bytes[i * 2])?;
        let low = hex_value(bytes[i * 2 + 1])?;
        *slot = (high << 4) | low;
    }
    Some(key)
}

/// Convert a single ASCII hex character (`0-9`, `a-f`, `A-F`) to its
/// nibble value, or `None` if it is anything else — including
/// non-ASCII bytes from a UTF-8 multi-byte sequence.
fn hex_value(c: u8) -> Option<u8> {
    match c {
        b'0'..=b'9' => Some(c - b'0'),
        b'a'..=b'f' => Some(10 + c - b'a'),
        b'A'..=b'F' => Some(10 + c - b'A'),
        _ => None,
    }
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
            // Each step that previously called `.expect(...)` now
            // propagates a `Box<dyn Error>` through the `?` operator —
            // any failure (read-only home, locked Linux Secret Service,
            // disk full, corrupt SQLite) lands on Tauri's setup-error
            // path which logs the cause and refuses to bring up the
            // window, instead of dumping a Rust panic ("DBLand quit
            // unexpectedly") with no recourse for the user.
            //
            // Once we have a startup-error UI surface, the catch site
            // can route through that. For now `Err(...)` from `setup`
            // already prevents window creation, which is the right
            // outcome — half-initialised state running queries against
            // a missing keychain is worse than a clean refusal.

            // Get app data directory for storage
            let app_data_dir = app.path().app_data_dir().map_err(|e| -> Box<dyn std::error::Error> {
                Box::from(format!("Failed to get app data directory: {e}"))
            })?;

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir).map_err(|e| -> Box<dyn std::error::Error> {
                Box::from(format!(
                    "Failed to create app data directory at {}: {e}",
                    app_data_dir.display()
                ))
            })?;

            // Master key now lives in the OS keychain (migrated from `.key` if present).
            // If the keychain is unreachable (locked Secret Service on Linux, headless
            // CI, etc.) we refuse to start — without the key we cannot decrypt saved
            // credentials, and continuing with a fresh key would silently lose them.
            let key = load_or_create_master_key(&app_data_dir)
                .map_err(|e| -> Box<dyn std::error::Error> {
                    Box::from(format!("Failed to load master encryption key: {e}"))
                })?;

            // Initialize storage
            let db_path = app_data_dir.join("connections.db");
            let storage = ConnectionStorage::new(db_path, &key)
                .map_err(|e| -> Box<dyn std::error::Error> {
                    Box::from(format!("Failed to initialize connection storage: {e}"))
                })?;

            // Initialize query history storage
            let history_db_path = app_data_dir.join("query_history.db");
            let query_history = QueryHistoryStorage::new(history_db_path).map_err(
                |e| -> Box<dyn std::error::Error> {
                    Box::from(format!("Failed to initialize query history storage: {e}"))
                },
            )?;

            // Initialize saved queries storage
            let saved_queries_db_path = app_data_dir.join("saved_queries.db");
            let saved_queries = SavedQueriesStorage::new(saved_queries_db_path).map_err(
                |e| -> Box<dyn std::error::Error> {
                    Box::from(format!("Failed to initialize saved queries storage: {e}"))
                },
            )?;

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

#[cfg(test)]
mod master_key_codec {
    use super::*;

    #[test]
    fn round_trip_preserves_bytes() {
        let key: [u8; 32] = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
            0x0e, 0x0f, 0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb,
            0xfc, 0xfd, 0xfe, 0xff,
        ];
        let encoded = encode_master_key(&key);
        assert_eq!(encoded.len(), 64);
        let decoded = decode_master_key(&encoded).expect("round-trip must succeed");
        assert_eq!(decoded, key);
    }

    #[test]
    fn encode_uses_lowercase_hex() {
        let key = [0xab; 32];
        let encoded = encode_master_key(&key);
        assert_eq!(encoded, "ab".repeat(32));
    }

    #[test]
    fn decode_rejects_wrong_length() {
        assert!(decode_master_key("").is_none());
        assert!(decode_master_key(&"a".repeat(63)).is_none());
        assert!(decode_master_key(&"a".repeat(65)).is_none());
    }

    #[test]
    fn decode_rejects_non_hex_characters() {
        // Length is right (64) but contains non-hex
        let bogus = format!("zz{}", "a".repeat(62));
        assert!(decode_master_key(&bogus).is_none());
    }

    #[test]
    fn decode_accepts_uppercase_hex() {
        let key = [0xABu8; 32];
        assert_eq!(decode_master_key(&"AB".repeat(32)), Some(key));
        // Mixed-case must work too — round-trippable with `encode_master_key`
        // output (lowercase) and with hex pasted from external tooling.
        assert_eq!(decode_master_key(&"aB".repeat(32)), Some(key));
    }

    /// Regression: the previous implementation only checked
    /// `s.len() == 64` and then sliced `&s[i*2..i*2+2]`. `len()` counts
    /// bytes, so a 64-byte string containing a multi-byte UTF-8
    /// codepoint would slip past the length check, and slicing inside
    /// the codepoint would panic at runtime. A user (or attacker)
    /// seeding the keychain with garbage bytes would crash the app at
    /// startup with no recourse — the byte-view rewrite must reject
    /// this cleanly instead.
    #[test]
    fn decode_rejects_multibyte_utf8_without_panic() {
        // 16 copies of "ñ" (U+00F1, 2 bytes each) = 32 bytes; pad with
        // ASCII to 64 bytes total.
        let mixed = format!("{}{}", "ñ".repeat(16), "0".repeat(32));
        assert_eq!(mixed.len(), 64, "regression input must be 64 bytes");
        assert!(decode_master_key(&mixed).is_none());
    }
}
