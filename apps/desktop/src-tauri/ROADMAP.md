# Tauri Backend Roadmap

> Crate version: **1.1.0**. All milestones below have shipped through
> v1.0.0 + v1.1.0. Forward-looking work is tracked in the top-level
> [ROADMAP.md](../../../ROADMAP.md).

## v0.1.0 - Setup

**Status:** ✅ Completed

- [x] Tauri 2.0 config
- [x] Window setup
- [x] IPC commands structure
- [x] Build pipeline

---

## v0.2.0 - MongoDB Commands

**Status:** ✅ Completed

- [x] connect_mongodb
- [x] disconnect
- [x] execute_query
- [x] get_databases
- [x] get_collections
- [x] get_documents

---

## v0.3.0 - Redis Commands

**Status:** ✅ Completed

- [x] connect_redis
- [x] get_keys
- [x] get_value
- [x] set_value
- [x] delete_key
- [x] get_ttl

---

## v0.4.0 - Connection Storage

**Status:** ✅ Completed

- [x] SQLite setup
- [x] save_connection
- [x] get_connections
- [x] delete_connection
- [x] AES-256-GCM encryption (master key migrated to OS keychain in v1.1.0)

---

## v0.5.0 - SSH Tunnel

**Status:** ✅ Completed

- [x] `ssh2` integration (we ended up on `ssh2` rather than `russh`)
- [x] Password authentication
- [x] Key-file authentication (with optional passphrase)
- [x] SSH-agent authentication
- [x] Structured (non-leaking) error logging

---

## v0.6.0 - Import/Export

**Status:** ✅ Completed

- [x] import_json
- [x] export_json
- [x] import_csv
- [x] export_csv
- [x] Streamed processing for large files (chunked, 100 docs/batch)

---

## v1.1.0 — additions

- [x] Profiler / collection-stats / geospatial / GridFS / replica-set /
      sharding command groups
- [x] Strict CSP and explicit `capabilities/default.json`
- [x] MongoDB query operator whitelist (`$where` / `$function` / `$accumulator`
      rejected recursively, covered by Rust unit tests)
- [x] Master-key hex codec with round-trip + invalid-input tests
