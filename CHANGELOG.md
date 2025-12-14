# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.3.0] - 2025-12-14

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
