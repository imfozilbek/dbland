# TODO

Technical debt and pending improvements.

---

## Current Sprint: v0.3.0 - Basic UI

### In Progress

- [ ] Create Connection Manager UI (dialog/form)
- [ ] Add connection form validation
- [ ] Implement test connection button in UI

### Backlog

- [ ] App layout (sidebar, editor, results)
- [ ] Schema browser (tree view)
- [ ] Query editor (Monaco)
- [ ] Basic results viewer

---

## Completed: v0.2.0 - Core Connectivity

- [x] Implement SQLite storage for connections
- [x] Add encrypted credentials storage (AES-256-GCM)
- [x] Implement connection state management (Zustand)
- [x] Create MongoDB adapter (Rust)
- [x] Create Redis adapter (Rust)
- [x] Create connection pool state management
- [x] Update Tauri commands to use new adapters

---

## Completed: v0.1.0 - Foundation

- [x] Create project plan
- [x] Define architecture
- [x] Create roadmaps
- [x] Setup root configs (package.json, tsconfig, eslint, prettier)
- [x] Create CLAUDE.md
- [x] Create ROADMAP.md
- [x] Create TODO.md
- [x] Create CHANGELOG.md
- [x] Setup monorepo structure
- [x] Create libs/core package (DDD architecture)
- [x] Create packages/ui package (20+ components)
- [x] Create apps/desktop with Tauri
- [x] Create apps/web with React + Vite
- [x] Configure Vitest for testing (18 tests)
- [x] Add CI/CD pipeline (GitHub Actions)

---

## Technical Debt

None yet.

---

## Ideas / Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add Storybook for UI components
- [ ] Add i18n support
- [ ] Add telemetry (opt-in)
