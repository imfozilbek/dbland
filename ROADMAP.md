# DBLand Product Roadmap

## Vision

Become the #1 GUI/web client for NoSQL databases.

---

## v0.1.0 - Foundation

**Status:** ✅ Completed

**Goals:**
- [x] Monorepo infrastructure
- [x] Base UI components
- [x] Tauri desktop shell
- [x] Web application
- [x] CI/CD pipeline

**Deliverables:**
- Working monorepo with pnpm
- 24+ UI components (Radix UI + Tailwind)
- Tauri application with React
- Web application with React + Vite
- GitHub Actions CI/CD

---

## v0.2.0 - Core Connectivity

**Status:** ✅ Completed

**Goals:**
- [x] MongoDB adapter (Rust)
- [x] Redis adapter (Rust)
- [x] Connection management
- [x] Encrypted credentials storage

**Deliverables:**
- MongoDB / Redis connectivity
- Persistent connection list (SQLite)
- Test connection action
- AES-256 credential encryption
- Zustand state management

---

## v0.3.0 - Basic UI

**Status:** ✅ Completed

**Goals:**
- [x] App layout (sidebar, editor, results)
- [x] Connection manager UI
- [x] Schema browser (tree)
- [x] Shared component architecture (desktop/web)
- [x] Query editor (Monaco)
- [x] Basic results viewer

**Deliverables:**
- Full UI shell
- Schema browser (tree view)
- Components shared between desktop and web
- Monaco editor with syntax highlighting
- Results viewer (Table, JSON, Tree modes)

---

## v0.4.0 - Query Features

**Status:** ✅ Completed

**Goals:**
- [x] Query history
- [x] Saved queries (snippets)
- [x] Autocomplete (collections, fields)
- [x] Query formatting
- [x] Query explain

**Deliverables:**
- Searchable query history
- Tagged saved queries
- Editor autocomplete
- Query formatter
- Query profiling (explain plan)

---

## v0.5.0 - Document Editing

**Status:** ✅ Completed

**Goals:**
- [x] Document editor (form + JSON)
- [x] Inline editing in results
- [x] Clone document
- [x] Nested document support
- [x] Array manipulation

**Deliverables:**
- Document editor (Form / JSON modes)
- CRUD operations from the UI
- Nested object support
- Array manipulation
- Field validation

---

## v0.6.0 - Import/Export

**Status:** 🟡 Partial — JSON shipped, CSV / BSON deferred

**Goals:**
- [x] JSON import/export
- [ ] CSV import/export (with field mapping) — deferred
- [ ] BSON import/export — deferred
- [ ] Field mapping for CSV — deferred (depends on CSV import)
- [x] Progress indicator (UI plumbing)

**Deliverables:**
- JSON import/export through `apps/desktop/src-tauri/src/commands/import_export.rs`
- Export with query-based filters
- Chunked processing (100 docs/batch)
- Real-time progress tracking
- Large-file support

> The Import / Export dialogs in the UI list CSV and BSON as
> "Coming soon" and the matching arms in the Rust command return
> "not yet implemented" — the implementation never landed alongside
> JSON. Tracked for a follow-up release.

---

## v0.7.0 - Aggregation Builder

**Status:** ✅ Completed

**Goals:**
- [x] Visual pipeline builder
- [x] Drag & drop stages
- [x] Stage preview
- [x] Code generation
- [x] Bidirectional sync (visual ↔ code)

**Deliverables:**
- Visual aggregation pipeline builder
- 10+ supported stages ($match, $group, $project, $sort, $limit, $skip, $lookup, $unwind, $addFields, $count)
- Drag-and-drop with @dnd-kit
- Intermediate-result preview
- Code generation from the visual pipeline

---

## v0.8.0 - Index Manager

**Status:** ✅ Completed

**Goals:**
- [x] View indexes
- [x] Create indexes (simple, compound, unique, TTL)
- [x] Index usage stats
- [x] Drop/rebuild indexes

**Deliverables:**
- Full index management
- Index-usage statistics
- Support for every MongoDB index type
- Background index creation
- Index performance monitoring

---

## v0.9.0 - SSH & Advanced Connectivity

**Status:** ✅ Completed

**Goals:**
- [x] SSH tunnel (password)
- [x] SSH tunnel (key file)
- [x] SSH tunnel (agent)
- [x] SSL/TLS connections
- [x] Connection string builder

**Deliverables:**
- SSH tunneling with three auth methods
- SSL/TLS support with certificates
- Connection-string builder (parse/build URI)
- Encrypted SSH config storage
- Tabbed connection manager UI
- Automatic tunnel management

---

## v0.10.0 - Redis Features

**Status:** ✅ Completed

**Goals:**
- [x] Key browser with pattern search
- [x] TTL management
- [x] Data type viewers (String, List, Set, Hash, ZSet)
- [ ] Pub/Sub monitor (deferred to v1.2.0)
- [x] Slow log viewer

**Deliverables:**
- Redis support
- Pattern-based key search (SCAN)
- Viewers for every data type
- TTL viewer/editor
- Slow log with performance metrics
- Type auto-detection

> Pub/Sub real-time monitor was originally planned here but did not ship in v0.10.0;
> it is tracked in v1.2.0 instead.

---

## v1.0.0 - Production Release 🎉

**Status:** ✅ Completed

**Goals:**
- [x] Keyboard shortcuts (platform-aware)
- [x] Dark/Light themes (with system preference)
- [x] Settings UI
- [x] Auto-updater (with signed releases)
- [x] Installers (DMG, MSI, DEB, AppImage)
- [x] Documentation (User Guide + Contributing)
- [x] CI/CD multi-platform builds

**Deliverables:**
- Production-ready release
- Cross-platform installers for macOS, Windows, Linux
- Auto-updater wired into GitHub Releases
- Comprehensive documentation
- Automated CI/CD pipeline
- Code signing across all platforms

---

## v1.1.0 - Enhanced MongoDB Features

**Status:** ✅ Completed

**Goals:**
- [x] Database profiler (system.profile, level / threshold control)
- [x] Collection statistics (count, size, indexes, validation, sharding)
- [x] Geospatial query support ($near, $geoWithin, $geoIntersects)
- [x] GridFS file browser (list, metadata, download, delete)
- [x] Replica set monitoring (members, health, replication lag, config)
- [x] Sharding visualization (shards, sharded collections, chunks)

**Deliverables:**
- 6 new Tauri commands in `apps/desktop/src-tauri/src/commands/`
- 6 new React components in `packages/ui/src/components/app/`
- Web platform stub completed for the full v1.1.0 surface
- Brand-aligned UI redesign (Inter, JetBrains Mono, GitHub-dark palette)

**Hardening (post-merge):**
- Strict CSP in `tauri.conf.json` (was `null`)
- Master AES-256-GCM key migrated to OS keychain (legacy `.key` file deleted on first launch)
- MongoDB query operator whitelist rejects `$where` / `$function` / `$accumulator`
- SSH tunnel logs scrubbed: only error variant kind, never auth payload
- Capabilities surface narrowed to `core` / `shell:allow-open` / `updater`
- `pnpm typecheck` script restored, lint warnings driven from 113 → 0
- Connection entity given intent-named transitions
  (`markConnecting` / `markConnected` / `markFailed` / `markDisconnected`)
- Default ports / auth db / query limit extracted into
  `domain/constants/database-defaults.ts`
- Web `PlatformAPI` stub completed (was missing 16+ v1.0–v1.1 methods)
- Redis viewers wired through to the platform API (were TODO stubs)
- `alert()` / `confirm()` replaced with sonner toasts + Radix `<AlertDialog>`
- `aria-label` on every icon-only button; keyboard nav on expandable rows
- 4 high-complexity functions and one over-long arrow split into named
  sub-components / factories
- libs/core test count: 18 → 73; src-tauri Rust tests: 5 → 17
- Coverage: domain entities 98.3%, value-objects 89.8%, use-cases 84.7%

---

## v1.0.0 Feature Summary

**MongoDB:**
- Query Editor with Monaco
- Query History (auto-save, search)
- Saved Queries (tags, descriptions)
- Results Viewer (Table, JSON, Tree)
- Document CRUD (Create, Read, Update, Delete, Clone)
- Import/Export (JSON; CSV / BSON deferred — see v0.6.0 above)
- Aggregation Pipeline Builder (10+ stages)
- Index Management (create, drop, stats)
- Autocomplete & formatting
- Query explain plan

**Redis:**
- Key Browser (pattern search)
- Data Viewers (String, List, Set, Hash, ZSet)
- TTL Management
- Slow Log Viewer
- Type auto-detection

**Connectivity:**
- SSH Tunneling (password, key, agent)
- SSL/TLS support
- Connection String Builder
- AES-256-GCM credential encryption

**User Experience:**
- Dark/Light themes
- Keyboard shortcuts
- Settings management
- Auto-save
- Platform-aware UI

**Infrastructure:**
- Auto-updater
- Multi-platform builds
- Code signing
- CI/CD pipeline
- Comprehensive docs

### Technical Metrics (post-v1.1.0)

| Metric | Value |
|--------|-------|
| Production commits since v1.0.0 | 14 |
| Lines of code | 8,500+ |
| Components | 40+ |
| TypeScript tests (`libs/core`) | 73 |
| Rust unit tests (`src-tauri`) | 17 |
| Domain coverage | ≈ 98% statements |
| Architecture | Clean Architecture + DDD |
| Encryption | AES-256-GCM with OS-keychain master key |

### Platform Support

- ✅ macOS (Universal Binary — Apple Silicon + Intel)
- ✅ Windows (NSIS Installer)
- ✅ Linux (DEB Package + AppImage)

---

## Future Roadmap (Post v1.1)

### v1.2.0 - Enhanced Redis Features

**Planned:**
- [ ] Pub/Sub real-time monitoring
- [ ] Redis Cluster support
- [ ] Redis Sentinel support
- [ ] Stream viewer (Redis Streams)
- [ ] Memory analysis tools
- [ ] LUA script editor

### v1.3.0 - Web Version

**Planned:**
- [ ] Browser-based client
- [ ] WebSocket proxy server
- [ ] Progressive Web App (PWA)
- [ ] Cloud deployment options
- [ ] Shared sessions

### v2.0.0 - More NoSQL Databases

**Planned:**
- [ ] Elasticsearch adapter
- [ ] Cassandra adapter
- [ ] CouchDB adapter
- [ ] DynamoDB adapter
- [ ] Neo4j adapter (Graph DB)
- [ ] InfluxDB adapter (Time Series)
- [ ] ScyllaDB adapter
- [ ] ArangoDB adapter (Multi-model)

### Enterprise Features

**Under consideration:**
- [ ] Cloud sync (optional)
- [ ] Team collaboration features
- [ ] Plugin system for extensions
- [ ] Query performance recommendations
- [ ] Automated backups
- [ ] Audit logs
- [ ] RBAC (Role-Based Access Control)
- [ ] SSO integration

---

## Development Principles

### SLC (Simple, Lovable, Complete)

DBLand follows **SLC, NOT MVP**:

- **Simple** — Easy to use, no unnecessary complexity
- **Lovable** — Delightful UX, polished design, feels premium
- **Complete** — Fully functional, no "coming soon" placeholders

### Architecture

- **Clean Architecture** — Domain, Application, Infrastructure layers
- **DDD** — Domain-Driven Design principles
- **SOLID** — Single Responsibility, Open/Closed, etc.
- **KISS** — Keep It Simple, Stupid
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Ain't Gonna Need It

### Quality Gates

Every commit must pass:
- ✅ `pnpm format` — Code formatting
- ✅ `pnpm lint` — 0 errors, 0 warnings
- ✅ `pnpm typecheck` — Type safety
- ✅ `pnpm test` — All tests pass

### Release Strategy

- Semantic Versioning (semver)
- Atomic commits per package
- Dependency order: core → ui → desktop → web
- Automated CI/CD builds
- Code signing for all platforms
- GitHub Releases with changelog

---

## Success Metrics

### v1.0.0 Achievement

✅ **All planned features implemented**
✅ **Production-ready quality**
✅ **Full MongoDB support**
✅ **Full Redis support (except Pub/Sub — v1.2.0)**
✅ **Cross-platform support**
✅ **Comprehensive documentation**
✅ **Automated releases**

### Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Query execution | < 100ms | ✅ |
| UI response | < 50ms | ✅ |
| Memory usage | < 512MB | ✅ |
| Bundle size (web) | < 500KB gzip | ✅ |
| Cold start | < 3s | ✅ |

### Security Checklist

- [x] AES-256-GCM encryption for credentials
- [x] Master encryption key in OS keychain (no plaintext on disk)
- [x] Strict Content-Security-Policy in Tauri WebView
- [x] No secrets in logs
- [x] Input validation on all inputs
- [x] NoSQL injection prevention (operator whitelist)
- [x] SSH keys never sent to frontend
- [x] SSL certificate validation
- [x] Code signing for releases
- [x] Auto-update signature verification

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

## License

MIT License — see [LICENSE](LICENSE) for details.
