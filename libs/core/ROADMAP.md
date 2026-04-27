# @dbland/core Roadmap

> Current version: **1.1.0**. The sub-versions below describe the original
> milestone breakdown that was used while building toward v1.0.0; they have
> all shipped. The package is tracked at the top-level
> [ROADMAP.md](../../ROADMAP.md) for forward-looking work.

## v0.1.0 - Types & Interfaces

**Status:** ✅ Completed

- [x] DatabaseType enum
- [x] ConnectionConfig type
- [x] QueryResult type
- [x] DatabaseAdapterPort interface

---

## v0.2.0 - MongoDB Adapter

**Status:** ✅ Completed (delivered through Tauri Rust adapters)

- [x] Connect / disconnect
- [x] Execute query
- [x] Get schema (databases, collections)
- [x] CRUD operations

> The `MongoDBAdapter` lives in `apps/desktop/src-tauri/src/adapters/mongodb.rs`
> rather than as a TypeScript class — the IPC boundary made a Rust-side
> implementation the cleaner choice.

---

## v0.3.0 - Redis Adapter

**Status:** ✅ Completed

- [x] Key operations
- [x] Data type handling
- [x] TTL management

> Same as Mongo: implemented in Rust under
> `apps/desktop/src-tauri/src/adapters/redis.rs`.

---

## v0.4.0 - Connection Management

**Status:** ✅ Completed

- [x] Connection entity (with intent-named transitions in v1.1.0)
- [x] ConnectionStoragePort
- [x] Encrypted storage (AES-256-GCM, master key in OS keychain since v1.1.0)
- [ ] Import/export (planned for a later release)

---

## v0.5.0 - Query Features

**Status:** ✅ Completed

- [x] Query entity
- [x] QueryHistory
- [x] SavedQuery
- [x] Query parsing/formatting

---

## v0.6.0 - Import/Export

**Status:** ✅ Completed

- [x] ExportDataUseCase
- [x] ImportDataUseCase
- [x] Format adapters (JSON, CSV, BSON)
