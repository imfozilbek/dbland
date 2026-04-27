# TODO

Technical debt and pending improvements.

---

## Current Sprint: post-v1.1.0 hardening + v1.2.0 prep

### In Progress

- [ ] Refactor 4 high-complexity functions flagged by ESLint (WorkspacePage,
      CollectionStats, ConnectionManagerDialog, getInitialFormData) — extract
      sub-components / handlers to bring complexity under 15
- [ ] Split the 147-line arrow function in `connection-store.ts:35` into
      smaller actions — currently exceeds the 100-line ESLint cap
- [ ] Replace `alert()` / `confirm()` calls in DatabaseProfiler and
      GridFSBrowser with `<AlertDialog>` / Toast (SLC: "Lovable", not browser
      native dialogs)
- [ ] Add `aria-label` to all icon-only buttons in `packages/ui/src/components/app`
      (DatabaseProfiler, GridFSBrowser, ReplicaSetMonitor — at least 20 places)
- [ ] Make `ExpandableTableRow` keyboard-operable (Enter/Space toggles)
- [ ] Replace `key={index}` with stable keys in DatabaseProfiler, ResultsJson
- [ ] Wrap large tables (DatabaseProfiler, future Redis viewers) in
      `useVirtualizer` like ResultsTable does
- [ ] Replace hardcoded NYC default coords in `GeospatialQueryBuilder` with
      `navigator.geolocation` lookup or a settings-driven default
- [ ] Add column sorting + CSV export to `CollectionStats`
- [ ] Migrate `apps/desktop/src/index.css` from Geist + Supabase emerald to
      Inter + JetBrains Mono and the GitHub-dark palette in
      `.skills/brand-guidelines/SKILL.md`
- [ ] Replace lingering `text-(red|green|blue|yellow)-\d+` Tailwind classes
      with brand tokens (`var(--success)`, `var(--destructive)`, …)
- [ ] Add `docs/ARCHITECTURE.md` (DDD layers, dependency direction, ACL)
- [ ] Add `docs/SECURITY.md` (CSP, keyring, threat model)

### Backlog

- [ ] Bring test coverage up to the thresholds advertised in CLAUDE.md
      (domain ≥ 90%, use cases ≥ 80%, UI ≥ 70%) — current ≈ 15-20%.
      Add tests for `ExecuteQueryUseCase`, `ConnectToDatabaseUseCase`,
      `GetSchemaUseCase`, `tunnel/ssh.rs`, `storage/sqlite.rs`, plus smoke
      tests for the v1.1.0 components.
- [ ] Tighten `DatabaseAdapterPort` types — replace `Record<string, unknown>`
      filters with engine-specific DTOs where the shape is known.
- [ ] Wire `setProfilerLevel` and `getProfilerData` for Redis through the
      web stub once the WebSocket transport lands.

---

## Completed: v1.1.0 hardening (2026-04-27)

- [x] Enable strict CSP in `tauri.conf.json`
- [x] Move encryption key from `.key` file to OS keychain (with migration)
- [x] Add `capabilities/default.json` with minimal permission set
- [x] Replace `eprintln!` in SSH tunnel with structured `log::warn!`
- [x] Reject `$where` / `$function` / `$accumulator` in MongoDB queries
- [x] Restore `pnpm typecheck` script (root + per-package)
- [x] Add `jsdom` devDep so `apps/web` tests can run
- [x] Complete the web `PlatformAPI` stub (was missing 16+ methods)
- [x] Wire Redis viewers (KeyBrowser, DataViewer, SlowLogViewer) to platform API
- [x] Drop 113 lint warnings to 5 (override platform-adapter rules,
      type JSON.parse results, fix non-null assertions)
- [x] Give `Connection` entity intent-named transitions
- [x] Extract default ports / auth db to `domain/constants/database-defaults.ts`
- [x] Resolve query language from connection pool (was hardcoded "mongodb")
- [x] Sync ROADMAP.md, CHANGELOG.md, TODO.md with v1.1.0 reality
- [x] gitignore local soul-kit dev tools (`.claude/`, `.soul/`, `scripts/`)

---

## Completed: v1.0.0 - Production Release (2025-01-24)

See `CHANGELOG.md` — auto-updater, signed releases, multi-platform installers,
SSH tunnel UI, full MongoDB + Redis feature set.

---

## Ideas / Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add Storybook for UI components
- [ ] Add i18n support
- [ ] Add telemetry (opt-in)
- [ ] WebSocket transport for the web build (unlocks v1.3.0)
