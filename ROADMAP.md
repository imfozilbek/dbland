# DBLand Product Roadmap

## Vision

Стать #1 GUI/WEB клиентом для NoSQL баз данных.

---

## v0.1.0 - Foundation

**Статус:** ✅ Completed

**Цели:**
- [x] Monorepo инфраструктура
- [x] Базовые UI компоненты
- [x] Tauri desktop shell
- [x] Web приложение
- [x] CI/CD pipeline

**Deliverables:**
- Working monorepo с pnpm
- 20+ UI компонентов (Radix UI + Tailwind)
- Tauri приложение с React
- Web приложение с React + Vite
- GitHub Actions CI/CD
- 18 unit tests

---

## v0.2.0 - Core Connectivity

**Статус:** ✅ Completed

**Цели:**
- [x] MongoDB adapter (Rust)
- [x] Redis adapter (Rust)
- [x] Connection management
- [x] Encrypted credentials storage

**Deliverables:**
- Подключение к MongoDB/Redis
- Сохранение подключений (SQLite)
- Test connection функция
- AES-256 шифрование credentials
- Zustand state management

---

## v0.3.0 - Basic UI

**Статус:** 🚧 In Progress

**Цели:**
- [x] App layout (sidebar, editor, results)
- [x] Connection manager UI
- [x] Schema browser (tree)
- [x] Shared component architecture (desktop/web)
- [ ] Query editor (Monaco)
- [ ] Basic results viewer

**Deliverables:**
- Полноценный UI shell
- Просмотр схемы БД (Tree view)
- Общие компоненты для desktop и web
- Выполнение запросов

---

## v0.4.0 - Query Features

**Статус:** 📋 Planned

**Цели:**
- [ ] Query history
- [ ] Saved queries (snippets)
- [ ] Autocomplete (collections, fields)
- [ ] Query formatting
- [ ] Query explain

**Deliverables:**
- История запросов с поиском
- Автодополнение в редакторе
- Профилирование запросов

---

## v0.5.0 - Document Editing

**Статус:** 📋 Planned

**Цели:**
- [ ] Document editor (form + JSON)
- [ ] Inline editing in results
- [ ] Clone document
- [ ] Nested document support

**Deliverables:**
- Редактирование документов
- CRUD операции через UI

---

## v0.6.0 - Import/Export

**Статус:** 📋 Planned

**Цели:**
- [ ] JSON import/export
- [ ] CSV import/export
- [ ] BSON import/export
- [ ] Field mapping
- [ ] Progress indicator

**Deliverables:**
- Импорт данных с маппингом
- Экспорт с фильтрами

---

## v0.7.0 - Aggregation Builder

**Статус:** 📋 Planned

**Цели:**
- [ ] Visual pipeline builder
- [ ] Drag & drop stages
- [ ] Stage preview
- [ ] Code generation

**Deliverables:**
- Визуальный построитель aggregation pipeline

---

## v0.8.0 - Index Manager

**Статус:** 📋 Planned

**Цели:**
- [ ] View indexes
- [ ] Create indexes
- [ ] Index usage stats
- [ ] Drop/rebuild indexes

**Deliverables:**
- Полное управление индексами

---

## v0.9.0 - SSH & Advanced Connectivity

**Статус:** 📋 Planned

**Цели:**
- [ ] SSH tunnel (password)
- [ ] SSH tunnel (key file)
- [ ] SSH tunnel (agent)
- [ ] SSL/TLS connections
- [ ] Connection string builder

**Deliverables:**
- SSH туннелирование
- Secure connections

---

## v0.10.0 - Redis Features

**Статус:** 📋 Planned

**Цели:**
- [ ] Key browser
- [ ] TTL management
- [ ] Data type viewers
- [ ] Pub/Sub monitor
- [ ] Slow log viewer

**Deliverables:**
- Полная поддержка Redis

---

## v1.0.0 - Production Release

**Статус:** 📋 Planned

**Цели:**
- [ ] Keyboard shortcuts
- [ ] Dark/Light themes
- [ ] Settings UI
- [ ] Auto-updater
- [ ] Installers (DMG, MSI, DEB)
- [ ] Documentation
- [ ] Landing page

**Deliverables:**
- Production-ready release
- Cross-platform installers

---

## Future (Post v1.0)

### More NoSQL Adapters
- Elasticsearch adapter
- Cassandra adapter
- CouchDB adapter
- DynamoDB adapter
- Neo4j adapter
- InfluxDB adapter
- ScyllaDB adapter
- ArangoDB adapter

### Platform Features
- Cloud sync (optional)
- Team features
- Plugin system
