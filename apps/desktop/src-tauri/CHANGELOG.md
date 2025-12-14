# Tauri Backend Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-12-14

### Added

- **Database Adapters** (`src/adapters/`)
  - `DatabaseAdapter` trait defining common interface
  - `MongoDbAdapter` - full MongoDB connectivity
    - Connection with URI builder
    - Database/collection listing with stats
    - Query execution with BSON support
  - `RedisAdapter` - full Redis connectivity
    - Connection with URL builder
    - Key browsing by prefix groups
    - Command execution with value conversion

- **State Management** (`src/state/`)
  - `ConnectionPool` - manages multiple active connections
  - Thread-safe connection storage with RwLock
  - Connection lifecycle management

- **Persistent Storage** (`src/storage/`)
  - `ConnectionStorage` - SQLite-based connection persistence
  - `Crypto` - AES-256-GCM encryption for credentials
  - Automatic schema migration
  - Encrypted password storage

- **IPC Commands** (`src/commands/`)
  - Refactored to use new adapter architecture
  - Added `server_version` to test results
  - Added `latency_ms` measurements

### Changed

- Restructured codebase into modular architecture
- Commands now use shared `AppState` with pool and storage
- Improved error handling with `thiserror`

### Dependencies

- Added `futures` for async stream processing
- Added `urlencoding` for safe URI construction

---

## [0.1.0] - 2025-01-15

### Added

- Tauri 2.0 configuration
- Window setup with custom size
- IPC commands structure
  - Connection commands (connect, disconnect, test_connection)
  - Schema commands (get_databases, get_collections, get_schema)
  - Query commands (execute_query, get_documents)
