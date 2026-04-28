<p align="center">
  <img src="https://raw.githubusercontent.com/imfozilbek/dbland/main/assets/logo.png" alt="DBLand Logo" width="120" />
</p>

<h1 align="center">DBLand</h1>

<p align="center">
  <strong>NoSQL Database Agnostic GUI/WEB Client</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-brightgreen.svg" alt="Version" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/MongoDB-Full%20Support-brightgreen.svg" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-Supported-brightgreen.svg" alt="Redis" />
  <img src="https://img.shields.io/badge/SSH-Tunneling-blue.svg" alt="SSH" />
</p>

---

## About

DBLand is a modern, cross-platform database client for NoSQL databases. Built with Tauri 2.0 and React, it provides a native desktop experience with the flexibility of web technologies.

**Supported databases:**
- MongoDB
- Redis

**Coming soon:**
- Elasticsearch
- Cassandra
- CouchDB
- DynamoDB
- Neo4j
- InfluxDB
- ScyllaDB
- ArangoDB

## Features

### ✅ Core Features
- **Cross-platform** — Native apps for macOS, Windows, and Linux
- **Connection Manager** — Save and organize your database connections
- **Secure Storage** — Credentials encrypted with AES-256-GCM
- **SSH Tunneling** — Secure connections via SSH (password, key, agent)
- **SSL/TLS Support** — Encrypted database connections
- **Modern UI** — Clean interface with light/dark themes

### ✅ MongoDB Support (Full)
- **Query Editor** — Monaco-powered with syntax highlighting and autocomplete
- **Query History** — Automatically save and search queries
- **Saved Queries** — Organize queries with tags
- **Results Viewer** — Table, JSON, and Tree view modes
- **Document CRUD** — Create, read, update, delete, and clone documents
- **Import/Export** — JSON format with chunked processing
- **Aggregation Builder** — Visual pipeline builder with drag-and-drop (10+ stages)
- **Index Management** — Create, drop, and monitor indexes with statistics
- **Keyboard Shortcuts** — Efficient workflow navigation

### ✅ Redis Support
- **Key Browser** — Pattern-based search with SCAN command
- **Data Viewers** — String, List, Set, Hash, Sorted Set viewers
- **TTL Management** — View and set expiration times
- **Slow Log** — Monitor slow queries with performance metrics
- **Type Detection** — Automatic detection of key data types

### 🆕 v1.1.0 — Enhanced MongoDB
- **Database Profiler** — system.profile read, level / threshold control
- **Collection Statistics** — count, size, index breakdown, sharding info
- **Geospatial Query Builder** — $near, $geoWithin, $geoIntersects
- **GridFS File Browser** — list, metadata, download, delete
- **Replica Set Monitor** — members, health, replication lag
- **Sharding Dashboard** — shards, sharded collections, chunk distribution

### 🔄 Coming Soon
- **CSV / BSON import-export** — only JSON ships today
- **Pub/Sub real-time monitor** — Redis pub/sub viewer
- **Web Version** — full client in the browser via a WebSocket proxy
  (the Vite web build today is a UI shell with a stub `PlatformAPI`)
- **More Databases** — Elasticsearch, Cassandra, CouchDB, DynamoDB, Neo4j

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/imfozilbek/dbland/releases) page.

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `DBLand_x.x.x_aarch64.dmg` |
| macOS (Intel) | `DBLand_x.x.x_x64.dmg` |
| Windows | `DBLand_x.x.x_x64-setup.exe` |
| Linux (Debian/Ubuntu) | `DBLand_x.x.x_amd64.deb` |
| Linux (AppImage) | `DBLand_x.x.x_amd64.AppImage` |

### Build from Source

Requirements:
- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Rust (for Tauri)

```bash
# Clone the repository
git clone https://github.com/imfozilbek/dbland.git
cd dbland

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run desktop app in development
cd apps/desktop && pnpm tauri:dev
```

## Development

### Project Structure

```
dbland/
├── apps/
│   ├── desktop/          # Tauri 2.0 + React desktop app
│   │   ├── src/          # React frontend
│   │   └── src-tauri/    # Rust backend
│   └── web/              # React + Vite web app
├── packages/
│   └── ui/               # Shared React components (@dbland/ui)
└── libs/
    └── core/             # Database abstraction library (@dbland/core)
```

### Architecture

```
User → Desktop/Web App → @dbland/ui → @dbland/core → Database Adapters → MongoDB/Redis
```

- **Desktop app** uses native Rust drivers via Tauri for optimal performance
- **Web app** uses WebSocket proxy for browser compatibility
- **@dbland/ui** provides shared React components (Radix UI + Tailwind)
- **@dbland/core** implements DDD architecture for database abstraction

### Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev:desktop    # Run desktop app
pnpm dev:web        # Run web app

# Build
pnpm build          # Build all packages

# Quality
pnpm lint           # Run ESLint
pnpm format         # Format with Prettier
pnpm test           # Run tests
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Runtime | Tauri 2.0 |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 4, Radix UI |
| State | Zustand |
| Backend (Desktop) | Rust, MongoDB Driver, Redis |
| Storage | SQLite (connections), AES-256-GCM (encryption) |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full product roadmap.

### Current Progress

- [x] **v0.1.0** — Foundation (monorepo, UI components, Tauri shell)
- [x] **v0.2.0** — Core Connectivity (MongoDB/Redis adapters, connection storage)
- [x] **v0.3.0** — Basic UI (connection manager, schema browser, query editor)
- [x] **v0.4.0** — Query Features (history, autocomplete, formatting)
- [x] **v0.5.0** — Document Editing
- [x] **v0.6.0** — Import/Export (🟡 JSON only; CSV / BSON deferred)
- [x] **v0.7.0** — Aggregation Builder
- [x] **v0.8.0** — Index Manager
- [x] **v0.9.0** — SSH & Advanced Connectivity
- [x] **v0.10.0** — Redis Features (🟡 Pub/Sub deferred to v1.2.0)
- [x] **v1.0.0** — Production Release
- [x] **v1.1.0** — Enhanced MongoDB Features
- [ ] **v1.2.0** — Enhanced Redis Features (Pub/Sub, Cluster, Sentinel, Streams)
- [ ] **v1.3.0** — Web Version (browser-based via WebSocket proxy)

## Contributing

We welcome contributions!

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm lint`)
5. Commit with conventional commits (`git commit -m "feat: add amazing feature"`)
6. Push and open a Pull Request

### Code Style

- 4 spaces indentation
- Double quotes
- No semicolons
- See [CLAUDE.md](CLAUDE.md) for detailed guidelines

## Acknowledgments

- [Tauri](https://tauri.app/) — Desktop runtime
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [MongoDB Rust Driver](https://github.com/mongodb/mongo-rust-driver)
- [Redis RS](https://github.com/redis-rs/redis-rs)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/imfozilbek">Fozilbek Samiyev</a>
</p>
