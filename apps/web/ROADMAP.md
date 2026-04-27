# @dbland/web Roadmap

> Current version: **1.1.0**. The web build is currently a Vite shell with
> a stub `PlatformAPI` (every method rejects with "use desktop app"). The
> real WebSocket transport that turns it into a usable client is tracked
> as v1.3.0 in the top-level [ROADMAP.md](../../ROADMAP.md).

## v0.1.0 - Shell

**Status:** ✅ Completed

- [x] Vite + React setup
- [x] Basic window
- [x] App layout structure
- [x] Build pipeline

---

## v0.2.0 - Layout

**Status:** ✅ Completed

- [x] AppLayout
- [x] Sidebar with resizable panels
- [x] Toolbar with connection selector
- [x] StatusBar with real-time status

---

## v0.3.0 - WebSocket Proxy

**Status:** 📋 Planned (v1.3.0)

- [ ] WebSocket client service
- [ ] Proxy server (Node.js)
- [ ] Connection pooling
- [ ] Reconnection handling
- [ ] Error handling

---

## v0.4.0 - Connection Manager

**Status:** ✅ Completed (UI only — backend connectivity arrives with v0.3.0 above)

- [x] Connection list
- [x] Add / Edit connection dialog
- [x] Connection groups
- [x] Persistence — currently in-memory; will move to localStorage / IndexedDB
      once the WebSocket proxy lands

---

## v0.5.0 - Schema Browser

**Status:** ✅ Completed (UI)

- [x] Database tree
- [x] Collection tree
- [x] Context menu

---

## v0.6.0 - Query Workspace

**Status:** ✅ Completed (UI)

- [x] Multi-tab editor
- [x] Monaco integration
- [x] Results panel
- [x] History sidebar

---

## v0.7.0 - Advanced Features

**Status:** ✅ Completed (UI)

- [x] Document editor
- [x] Aggregation builder
- [x] Index manager
- [x] Import / Export dialogs

---

## v0.8.0 - Settings & Storage

**Status:** ✅ Completed

- [x] Preferences dialog
- [x] Theme switcher
- [x] Keyboard shortcuts
- [x] Editor settings
- [ ] IndexedDB for large data (deferred to v1.3.0 with the WebSocket proxy)
