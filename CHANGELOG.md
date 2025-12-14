# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- N/A

### Changed

- N/A

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
