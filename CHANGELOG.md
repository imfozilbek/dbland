# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
