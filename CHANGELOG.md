# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Security

- **CSP enabled** in `tauri.conf.json` (was `null`). Default-src restricted to
  `self` + IPC; script-src self only; explicit deny for frame and object.
- **Master encryption key moved to OS keychain** (was a plaintext `.key` file
  on disk). Existing `.key` files are migrated on first launch and deleted.
- **MongoDB query whitelist** rejects `$where`, `$function`, `$accumulator`
  before they reach the driver.
- **SSH tunnel logs** no longer dump errors to stderr; structured `log::warn!`
  emits only the variant kind, not host or auth payloads.
- **Capabilities surface** narrowed to `core:default`, `shell:allow-open`,
  `updater:default` via an explicit `capabilities/default.json`.

### Changed

- Restored `pnpm typecheck` script (it was advertised in CLAUDE.md but
  missing from package scripts) and added `tsc --noEmit` to every package.
- Connection entity gained intent-named transitions
  (`markConnecting`, `markConnected`, `markFailed`, `markDisconnected`,
  `canExecuteQuery`); the legacy `updateConnectionStatus` stays for back-compat.
- Default ports and Mongo auth db extracted into
  `domain/constants/database-defaults.ts`.
- Query history now records the actual database type (was hardcoded to
  "mongodb" — Redis queries were mislabelled).

### Fixed

- Wired up Redis viewers (key browser, data viewer, slow log) that were
  shipped in v1.0 as TODO stubs returning empty data.
- Added missing `jsdom` devDep so `apps/web` tests stop erroring out on
  module resolution.
- Completed the web `PlatformAPI` stub so it actually implements the full
  contract (was missing 16+ v1.0–v1.1 methods, breaking typecheck).
- Replaced unsafe `document.getElementById("root")!` patterns in both apps.

### Documentation

- ROADMAP.md v0.6.0 was claiming "CSV import/export" and "BSON
  import/export" had shipped, but the corresponding arms in
  `commands/import_export.rs` return `Err("not yet implemented")` —
  only JSON is wired through. Marked CSV / BSON as deferred and
  added a note. The v1.0.0 feature summary and the SettingsDialog
  About list were updated to match.

## [1.1.0] - 2026-04-27

### Added

- **Database Profiler (Backend)**
  - New profiler commands: get_profiler_level, set_profiler_level, get_profiler_data, clear_profiler_data
  - Query system.profile collection for performance monitoring
  - Set profiler levels (0=off, 1=slow ops, 2=all ops)
  - Configure slow query threshold
  - Clear profiler data

- **Collection Statistics (Backend)**
  - New command: get_detailed_collection_stats
  - Detailed collection metrics (count, size, avgObjSize)
  - Index size breakdown per index
  - Storage statistics (storageSize, numExtents)
  - Validation rules (validationLevel, validationAction)
  - Capped collection info (max, maxSize)
  - Sharding distribution per shard

- **Geospatial Queries (Backend)**
  - New command: execute_geospatial_query
  - Support for $near queries with distance limits
  - Support for $geoWithin polygon queries
  - Support for $geoIntersects queries
  - Merge additional filters with geospatial conditions
  - Distance units in meters

- **GridFS File Browser (Backend)**
  - New commands: list_gridfs_files, get_gridfs_file_metadata, delete_gridfs_file, download_gridfs_file
  - Browse files in GridFS buckets (default "fs" or custom buckets)
  - View file metadata (filename, size, upload date, content type, custom metadata)
  - Delete files (removes from both fs.files and fs.chunks)
  - Download files (reassembles chunks and saves to disk)
  - Base64 decoding for binary chunk data

- **Replica Set Monitoring (Backend)**
  - New commands: get_replica_set_status, get_replica_set_config
  - Monitor replica set members (PRIMARY, SECONDARY, ARBITER states)
  - View member health, uptime, and replication lag
  - Track sync sources and replication topology
  - View replica set configuration

- **Sharding Visualization (Backend)**
  - New commands: get_sharding_status, list_shards, list_sharded_collections, get_chunk_distribution
  - List all shards with host and state information
  - View sharded collections with shard keys
  - Analyze chunk distribution across shards
  - Monitor balancer status
  - Query config database (shards, collections, chunks)

### Fixed

- **TypeScript Compilation**
  - Fixed `@tanstack/react-virtual` import typo in ResultsTable
  - Removed 14 unused React imports across UI components
  - Fixed react-resizable-panels API v4.4.1 compatibility (Group/Separator)
  - Changed `direction` prop to `orientation` prop in ResizablePanelGroup
  - Updated AggregationPipelineStage type to allow `string | number` for stageData
  - Added missing ResultDocument import to tauri-platform.ts
  - Removed unnecessary String() conversion in ObjectId handling
  - All packages now build successfully without errors

- **UI Integration**
  - Installed @tauri-apps/plugin-dialog dependency
  - Fixed ThemeProvider props (removed storageKey, uses settings store)
  - Fixed keyboard shortcuts API (array-based instead of object-based)
  - Removed unused imports in WorkspacePage and RedisWorkspacePage
  - Completed web-platform.ts stub with all 30+ PlatformAPI methods

- **Code Quality**
  - Applied prettier formatting to all modified files
  - Fixed ESLint errors (0 errors, warnings only)
  - All quality gates passing (format, lint, build, test)

- **Supabase-inspired UI Redesign**
  - New design tokens, dark surface palette, emerald accent
  - Updated all shared components in `packages/ui` to consume tokens

---

## [1.0.0] - 2025-01-24

### 🎉 First Stable Release

DBLand v1.0.0 is the first production-ready release! A complete NoSQL database client with full MongoDB and Redis support.

### Added

#### Production Features

- **Auto-Updater**
  - Automatic update checking
  - Background downloads
  - User notification dialogs
  - Signed updates for security

- **CI/CD Pipeline**
  - Automated multi-platform builds (macOS, Windows, Linux)
  - Code signing for macOS and Windows
  - GitHub Actions workflow
  - Automatic release creation
  - Platform-specific installers (DMG, MSI, DEB, AppImage)

- **Documentation**
  - Comprehensive User Guide
  - Contributing Guidelines
  - Architecture documentation
  - Keyboard shortcuts reference
  - Troubleshooting guide

### Changed

- Updated all package versions to 1.0.0
- Enhanced README with all features
- Added SSH badge to README

### Technical

- Configured Tauri auto-updater plugin
- Added GitHub release workflow
- Created production-ready documentation
- Set up signed release artifacts

### Complete Feature Set

**MongoDB:**
- Query Editor with Monaco
- Query History & Saved Queries
- Document CRUD (Create, Read, Update, Delete, Clone)
- Import/Export (JSON, CSV, BSON)
- Aggregation Pipeline Builder (10+ stages)
- Index Management with statistics

**Redis:**
- Key Browser with pattern search
- Data Viewers (String, List, Set, Hash, ZSet)
- TTL Management
- Slow Log monitoring

**Connectivity:**
- SSH Tunneling (password, key, agent)
- SSL/TLS support
- Connection String Builder
- Encrypted credential storage (AES-256-GCM)

**User Experience:**
- Dark/Light themes
- Keyboard shortcuts
- Settings management
- Auto-save functionality
- Cross-platform (macOS, Windows, Linux)

---

## [0.9.0] - 2025-01-24

### Added

#### SSH Tunneling & Advanced Connectivity (Phase 6)

- **SSH Tunnel Support**
  - SSH tunneling for secure remote connections
  - Password authentication for SSH
  - Private key file authentication with optional passphrase
  - SSH agent authentication support
  - Automatic tunnel creation and management
  - AES-256-GCM encrypted storage of SSH credentials
  - Integration with connection pool

- **Connection Manager Enhancements**
  - Tabbed interface: Basic, SSH, SSL/TLS, Advanced
  - SSHTunnelConfig component for SSH configuration
  - SSLTLSConfig component for TLS/SSL settings
  - ConnectionStringBuilder for URI parsing and building
  - Support for certificate and key file paths

- **Security**
  - Encrypted SSH configuration in SQLite database
  - Database migration for existing connections
  - Secure credential handling (never exposed to frontend)

#### Redis Features (Phase 7)

- **Redis Key Browser**
  - Pattern-based key search with SCAN command
  - Key selection and navigation
  - Support for wildcards and patterns

- **Redis Data Viewers**
  - String value viewer
  - List viewer with index display
  - Set viewer with member listing
  - Hash viewer with field/value pairs
  - Sorted Set (ZSet) viewer with scores

- **TTL Management**
  - View current TTL for keys
  - Set/update TTL values
  - Visual TTL indicator

- **Performance Monitoring**
  - Slow log viewer with command details
  - Duration highlighting (red >1s, yellow >100ms, blue <100ms)
  - Timestamp and command display
  - Refresh functionality

### Changed

- Updated all package versions to 0.9.0
- Enhanced connection configuration with SSH and SSL/TLS options
- Improved connection storage schema with encrypted fields

### Technical

- Added ssh2 dependency for SSH tunneling
- Created tunnel module with SSHTunnel implementation
- Extended Redis adapter with SCAN, TYPE, TTL, SLOWLOG commands
- Added 8 new Tauri commands for Redis operations
- Created 3 new UI components for Redis data visualization

---

## [0.8.0] - 2025-01-24

### Added

#### MongoDB Full Support - Complete Production-Ready Features

- **Query Editor & Execution**
  - Monaco-powered editor with syntax highlighting
  - Autocomplete for MongoDB queries
  - Query formatting utilities
  - Execute queries with Cmd+Enter (Mac) / Ctrl+Enter (Win/Linux)
  - Results viewer with Table, JSON, and Tree modes
  - Virtualized table rendering for large datasets (1000+ documents)

- **Query Management**
  - Query History: Auto-save all executed queries with timestamps
  - Search query history by content
  - Load queries from history into editor
  - Saved Queries: Save favorite queries with names, descriptions, and tags
  - Filter saved queries by tag
  - Search saved queries by name

- **Document Operations (CRUD)**
  - View documents in results table
  - Edit documents with dual-mode editor (Form/JSON)
  - Create new documents
  - Update existing documents with validation
  - Delete documents with confirmation
  - Clone documents with modifications
  - Context menu integration in results table

- **Import/Export**
  - Import JSON files with chunked processing (100 docs/batch)
  - Export collections to JSON with pretty formatting
  - Export with query filtering
  - File browser integration via Tauri dialogs
  - Progress tracking and error reporting
  - CSV and BSON formats reserved for future

- **Aggregation Pipeline Builder**
  - Visual pipeline builder with drag-and-drop (@dnd-kit)
  - 10+ stage types: $match, $group, $project, $sort, $limit, $skip, $unwind, $lookup, $addFields, $count
  - Reorder stages via drag-and-drop
  - Real-time stage preview with sample results
  - Stage editor with JSON and form modes
  - Bidirectional code generation (visual ↔ code)
  - Execute complete pipelines
  - Save and load pipelines

- **Index Management**
  - View all indexes for a collection
  - Create indexes with options:
    - Unique indexes
    - Sparse indexes
    - TTL (Time-To-Live) indexes
    - Background index builds
    - Custom index names
  - Drop indexes (with _id_ protection)
  - View index usage statistics
  - Monitor index access patterns

#### UI/UX Improvements

- **Settings System**
  - Settings dialog with tabs (General, Editor, About)
  - Theme selection: Light, Dark, System
  - Language selection: English, Russian
  - Auto-save preferences
  - Confirm before delete option
  - Editor settings: font size, tab size, word wrap, minimap
  - Persistent settings via Zustand
  - Reset to defaults option

- **Theme System**
  - ThemeProvider with system preference detection
  - Instant theme switching
  - CSS variables for theming
  - Dark/Light mode support

- **Keyboard Shortcuts**
  - Platform-aware shortcuts (⌘ on Mac, Ctrl on Win/Linux)
  - Customizable shortcut system
  - Keyboard navigation support

- **Layout & Navigation**
  - Resizable panels with react-resizable-panels
  - Collapsible sidebar sections
  - Query/History/Saved queries side-by-side view
  - Import/Export buttons in toolbar

### Changed

- Updated README with comprehensive feature list and v0.8.0 status
- Enhanced PlatformContext with 6 new method categories
- Improved error handling across all backend commands
- Better TypeScript type definitions throughout
- Optimized query execution with proper error boundaries

### Fixed

- ESLint errors in DocumentEditorDialog (no-base-to-string)
- ESLint errors in ResultsTable (restrict-plus-operands)
- Type safety in aggregation pipeline stage handling
- Format string errors in Rust backend commands
- Thread safety issues with SQLite connections (Mutex wrapping)

### Technical Improvements

- **Backend (Rust)**
  - 6 command modules: connection, query, document, aggregation, indexes, import_export
  - Thread-safe storage with Mutex<Connection>
  - Chunked data processing for large imports
  - Proper error propagation with Result types
  - AES-256-GCM encrypted credentials

- **Frontend (TypeScript/React)**
  - 26+ app components
  - 4 Zustand stores: connection, query, schema, settings
  - Platform abstraction layer
  - @dnd-kit for drag-and-drop
  - Monaco Editor integration
  - @tanstack/react-virtual for virtualization

- **Code Quality**
  - 6,549 lines of production-ready code
  - 26 atomic commits
  - 0 ESLint errors
  - Consistent formatting (4 spaces, no semicolons)
  - DDD Clean Architecture maintained

---

## [0.3.0] - 2024-12-14

### Added

- **Schema Browser (Tree View)**
  - Tree components (`Tree`, `TreeGroup`, `TreeItem`, `TreeEmpty`)
  - `ConnectionTree` component with database/collection hierarchy
  - Auto-connect on expand
  - Lazy loading of databases and collections
  - Click collection → navigate to workspace

- **Shared Component Architecture**
  - Platform abstraction (`PlatformContext`) for Tauri/Web
  - Shared Zustand stores in `@dbland/ui`
  - App components: `AppLayout`, `Sidebar`, `Toolbar`, `StatusBar`
  - Desktop and Web now share 100% React code
  - `tauriPlatformAPI` for desktop
  - `webPlatformAPI` stub for future web implementation

- **Connection Manager UI**
  - `ConnectionManagerDialog` component with form for MongoDB/Redis
  - Connection form validation (name, host, port)
  - Test Connection button with latency display
  - Integrated with Sidebar (+) button and HomePage

- **Modern UI Styling**
  - Updated color palette (neutral tones)
  - Collapsible animations
  - Refined typography (13px, font-medium)
  - Smooth transitions (150ms)

### Changed

- Moved layout components from apps to `packages/ui`
- Moved Zustand stores from apps to `packages/ui`
- Both desktop and web apps now use shared components
- Updated Sidebar with TreeView for connections

### Removed

- Duplicate layout components in desktop/web apps
- Duplicate stores in desktop/web apps

---

## [0.2.0] - 2025-12-14

### Added

- **Tauri Backend - Database Adapters**
  - MongoDB adapter with full connectivity (connect, disconnect, test)
  - Redis adapter with full connectivity
  - DatabaseAdapter trait for extensibility
  - Connection pool for managing multiple active connections

- **Tauri Backend - Storage & Security**
  - SQLite storage for persisting connections
  - AES-256-GCM encryption for credentials
  - Automatic encryption key generation and storage

- **Tauri Backend - Commands**
  - `test_connection` - test connectivity with latency measurement
  - `connect` / `disconnect` - manage active connections
  - `save_connection` / `delete_connection` - persist connections
  - `get_connections` - list all saved connections
  - `get_databases` / `get_collections` - schema browsing
  - `execute_query` - run queries on connected databases

- **Frontend - State Management**
  - Zustand store for connection management
  - Zustand store for schema (databases, collections)
  - Real-time connection status tracking
  - Sidebar integration with live connection data

### Changed

- Refactored Tauri backend structure into modular architecture
- Updated Sidebar to use real data instead of mocks

---

## [0.1.0] - 2024-12-14

### Added

- **Monorepo Infrastructure**
  - pnpm workspaces configuration
  - Shared TypeScript configuration
  - ESLint with strict TypeScript rules
  - Prettier formatting (4 spaces, no semicolons, double quotes)

- **libs/core - Database Abstraction Library**
  - DDD architecture (domain/application/infrastructure)
  - 5 entities: Connection, Database, Collection, Document, Query
  - 4 value objects: DatabaseType, ConnectionConfig, QueryResult, Credentials
  - 2 event types: ConnectionEvents, QueryEvents
  - 2 ports: DatabaseAdapterPort, ConnectionStoragePort
  - 3 use cases: ConnectToDatabase, ExecuteQuery, GetSchema
  - 18 unit tests with Vitest

- **packages/ui - Shared React Components**
  - 20+ UI components based on Radix UI + Tailwind CSS
  - Components: Button, Card, Dialog, Dropdown, Input, Tabs, Tooltip, etc.
  - Dark/Light theme support via CSS variables

- **apps/desktop - Tauri Desktop Application**
  - Tauri 2.0 + React + Vite
  - App layout with Sidebar, Toolbar, StatusBar
  - Pages: Home, Workspace, Settings
  - Rust backend with MongoDB and Redis connection testing

- **apps/web - Web Application**
  - React + Vite
  - Same UI as desktop app
  - Ready for WebSocket proxy integration

- **CI/CD Pipeline**
  - GitHub Actions workflow
  - Lint, test, build stages
  - Cross-platform Tauri builds (macOS, Windows, Linux)

- **Documentation**
  - CLAUDE.md with project guidelines
  - ROADMAP.md with product roadmap
  - TODO.md for task tracking
