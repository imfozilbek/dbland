# CLAUDE.md

> ⛔ **ALL RULES ARE MANDATORY. Zero tolerance for violations.**

## Updating This File (MANDATORY)

When modifying CLAUDE.md, you MUST follow these rules:

| Rule | Requirement |
|------|-------------|
| **Format** | Compact tables and bullet points, NO verbose explanations |
| **Examples** | Only critical code examples, max 5 lines each |
| **Language** | English only |
| **Size** | Keep under 400 lines total |
| **Structure** | Use `##` headers, tables, short code blocks |
| **Redundancy** | NO duplicate information across sections |
| **New rules** | Add to existing tables, don't create new sections |

**⛔ FORBIDDEN when editing:**
- Long prose paragraphs
- Multiple examples for same rule
- Redundant explanations
- Non-English text
- Sections longer than 30 lines

## Task Workflow (MANDATORY)

**⛔ MUST enter planning mode before starting ANY new task.**

| Rule | Requirement |
|------|-------------|
| **New tasks** | Always use `EnterPlanMode` tool first |
| **Purpose** | Plan implementation steps before writing code |
| **Exit** | Use `ExitPlanMode` only after plan is approved |

## Session Commands (MANDATORY)

### "start-work"
| Step | Action |
|------|--------|
| 1 | Analyze entire project (structure, TODOs, open tasks, component status) |
| 2 | Show brief status for each project part |
| 3 | Sort by progress (completed first, least ready last) |
| 4 | Bottom: show blocking/lagging task |

### "end-work"
| Step | Action |
|------|--------|
| 1 | Check uncommitted changes (git status, git diff) |
| 2 | Commit and release changes |
| 3 | Review git log for last 12 hours |
| 4 | Show summary: what done, progress achieved |

## Skills Usage (MANDATORY)

| Skill | When to Use |
|-------|-------------|
| `brand-guidelines` | Before any UI/frontend work — read colors, fonts, spacing |
| `frontend-design` | Creating UI components, pages, layouts |
| `software-architecture` | New features, refactoring, architecture decisions |
| `test-driven-development` | Writing tests, TDD workflow |

**⛔ RULES:**
- Always read `.skills/brand-guidelines/SKILL.md` before frontend development
- Use `frontend-design` skill for production-grade UI components
- Follow brand palette strictly — no arbitrary colors
- Use `software-architecture` for DDD, Clean Architecture, SOLID, KISS, DRY, YAGNI
- Use `test-driven-development` when writing or updating tests
- Invoke skills proactively, don't wait for user to ask

**Auto-install if not available:**
```bash
/plugin marketplace add NeoLabHQ/context-engineering-kit
/plugin install ddd@NeoLabHQ/context-engineering-kit
/plugin install tdd@NeoLabHQ/context-engineering-kit
```

## Project Overview

DBLand — NoSQL database agnostic GUI/WEB client. TypeScript + Rust monorepo (pnpm workspaces). Node.js >= 22.0.0, Rust required.

| Package | Description |
|---------|-------------|
| `@dbland/core` | Domain logic (DDD), database adapters |
| `@dbland/ui` | Shared React components |
| `@dbland/desktop` | Tauri 2.0 + React desktop app |
| `@dbland/web` | React + Vite web app |

**Root:** `/Users/fozilbeksamiyev/projects/dbland`

**Supported DBs:** MongoDB, Redis. Future: Elasticsearch, Cassandra, CouchDB, DynamoDB, Neo4j, InfluxDB.

## Commands

```bash
pnpm build                          # Build all
pnpm test                           # Test all
pnpm format                         # Format (4 spaces)
pnpm lint                           # Lint (0 errors, 0 warnings)
pnpm dev:desktop                    # Run Tauri desktop
pnpm dev:web                        # Run web app
pnpm --filter @dbland/core build    # Build specific package
```

## Code Style (MANDATORY)

```
4 spaces | no semicolons | double quotes | 100 chars max | trailing commas
```

## ESLint Rules (MUST FIX ALL)

| Rule | Fix |
|------|-----|
| `no-explicit-any` | Use `unknown`, generics, proper types |
| `explicit-function-return-type` | Always: `function foo(): string` |
| `no-floating-promises` | Always `await` or `.catch()` |
| `no-unused-vars` | Prefix with `_` |
| `prefer-const` | Use `const` unless reassigning |
| `eqeqeq` | Use `===` and `!==` |
| `curly` | Always use braces |
| `no-console` | Use `.warn` or `.error` only |
| `max-params` | Max 5 (8 for DDD) |
| `max-lines-per-function` | Max 100 |
| `complexity` | Max 15 |
| `max-depth` | Max 4 |

## Architecture (DDD + Clean Architecture)

```
Domain (inner)     → Entities, Value Objects, Events — NO framework imports
Application        → Use Cases, Ports (interfaces)
Infrastructure     → Controllers, Repositories, Adapters
```

**⛔ RULES:**
- Domain NEVER imports from outer layers
- Entities have behavior, not just data
- Value Objects are immutable
- No magic numbers/strings
- No hardcoded secrets

## Anti-patterns (FORBIDDEN)

| Pattern | Solution |
|---------|----------|
| Anemic Domain | Move logic INTO entities |
| `any` type | Use proper types |
| Framework in domain | Keep domain pure |
| Magic numbers | Named constants |
| Hardcoded secrets | Environment variables |

## Database Adapters

| Database | Status | Notes |
|----------|--------|-------|
| MongoDB | Implemented | Native Rust driver (Tauri) |
| Redis | Implemented | Native Rust driver (Tauri) |
| Elasticsearch | Planned | - |
| Cassandra | Planned | - |

**DatabaseAdapterPort Interface:**
```typescript
interface DatabaseAdapterPort {
    type: DatabaseType
    connect(config: ConnectionConfig): Promise<void>
    executeQuery(query: string): Promise<QueryResult>
}
```

## Tauri (Desktop)

**Structure:**
```
apps/desktop/
├── src/              # React frontend
└── src-tauri/        # Rust backend
    └── src/commands/ # Tauri commands
```

**⛔ RULES:**
- Native DB drivers in Rust only
- Frontend uses Tauri invoke API
- All DB operations via commands

## Git Commits

```
<type>(<package>): <subject>
feat(core): add mongodb adapter
fix(ui): resolve tree collapse issue
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**⛔ DO NOT add Claude Code footer or Co-Authored-By**

## Security (MANDATORY)

**FORBIDDEN:**
```typescript
eval(userInput)           // Code injection
new Function(userInput)   // Code injection
document.innerHTML = x    // XSS
`query ${userInput}`      // Injection
```

**REQUIRED:**
- Connection strings encrypted at rest
- Never log credentials
- Validate all inputs
- Check `git diff` before commit

## Testing (MANDATORY)

| Layer | Min Coverage |
|-------|--------------|
| Domain | 90% |
| Use Cases | 80% |
| UI Components | 70% |

```bash
pnpm test:coverage    # Must pass thresholds
```

## Performance (MANDATORY)

| Metric | Limit |
|--------|-------|
| Query execution | < 100ms |
| UI response | < 50ms |
| Memory | < 512MB |
| Bundle (web) | < 500KB gzip |

**⛔ AVOID:**
- Blocking main thread
- Fetching all documents
- Missing virtual scrolling for large datasets
- Unoptimized tree rendering

## Logging

```typescript
// ✅ GOOD
this.logger.info("Query executed", { database, duration })

// ⛔ BAD
console.log("Connection:", conn)
this.logger.info({ connectionString })  // Never log secrets
```

Levels: `error` → `warn` → `info` → `debug`

## Error Handling

```typescript
// Custom errors with codes
throw new ConnectionError("MongoDB", "Connection refused")

// Never swallow errors
try { } catch (e) { }  // ⛔ FORBIDDEN
```

## UI Components (packages/ui)

```
packages/ui/src/
├── components/ui/          # Base (Radix UI + Tailwind)
├── query-editor/           # Monaco Editor
├── results-viewer/         # Table/JSON/Tree
├── schema-browser/         # Database tree
└── connection-manager/     # Connection dialogs
```

## Import Order

```typescript
// 1. Node built-ins
// 2. External packages
// 3. @dbland/* packages
// 4. Relative (parent first)
// 5. Type-only imports
```

## Forbidden Patterns

```typescript
any                    // Use proper type
as any                 // Fix the type
// @ts-ignore          // Fix the error
!.                     // Use null checks
var                    // Use const/let
==                     // Use ===
console.log            // Use logger
dangerouslySetInnerHTML // XSS risk
```

## CI/CD

```yaml
stages: install → lint → typecheck → test → build → security → deploy
```

**⛔ FORBIDDEN:**
- Manual deploys
- Deploy without tests
- Deploy Friday after 16:00

## Release Pipeline

```bash
# 1. Atomic commits (one per entity/test/doc)
# 2. Quality gates
pnpm format && pnpm build && pnpm lint && pnpm test

# 3. Update CHANGELOG.md, ROADMAP.md
# 4. Version & tag
npm version minor
git tag <package>-v<version>
git push origin main --tags
```

## Session Start

**⛔ MUST read `./ROADMAP.md` first** to understand current status.

## Package Documentation (MANDATORY)

**⛔ Every package/app MUST have these files:**

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Milestones, tasks with checkboxes |
| `CHANGELOG.md` | Version history, what changed |
| `TODO.md` | Technical debt, known issues |

**Root level:**

| File | Purpose |
|------|---------|
| `/ROADMAP.md` | Master: phases, architecture, status table |
| `/CHANGELOG.md` | Optional: root-level changes only |

## ROADMAP.md Rules

| Rule | Requirement |
|------|-------------|
| Structure | Phases → Milestones → Tasks with `[x]`/`[ ]` |
| Versioning | Independent semver per package (v0.1.0) |
| Dependencies | Show "Depends on: package vX.X.X" |
| Status | ✅ Completed, 🔄 In Progress, ⏳ Planned |

## CHANGELOG.md Rules

**Format:** [Keep a Changelog](https://keepachangelog.com/)

```markdown
## [0.2.0] - 2025-01-15
### Added
- New feature X
### Fixed
- Bug in Y
### Changed
- Refactored Z
```

**⛔ RULES:**
- Update BEFORE release (not after)
- Group by: Added, Changed, Fixed, Removed
- Link to issues/PRs when relevant

## TODO.md Rules (Technical Debt)

**Format:**
```markdown
## High Priority
- [ ] Fix memory leak in X (#123)
- [x] ~~Refactor auth module~~ (done in v0.2.0)

## Low Priority
- [ ] Add caching to Y
```

**⛔ RULES:**
- Add items when you notice shortcuts/hacks
- Mark `[x]` when resolved
- Reference in commits: `fix(api): resolve issue (TODO #3)`
- Review before each release

**Dependency order (always):**
```
1. @dbland/core    (domain, adapters)
2. @dbland/ui      (shared components)
3. @dbland/desktop (uses core + ui)
4. @dbland/web     (uses core + ui)
```

## Shared Code Policy

**⛔ Code duplication is PROHIBITED.**

| Missing | Add to |
|---------|--------|
| Entity, VO, Port | `@dbland/core` |
| UI Component | `@dbland/ui` |
| Tauri Command | `apps/desktop/src-tauri` |

## Adding New Database

1. Add to `DatabaseType` enum in `@dbland/core`
2. Create adapter in `@dbland/core/infrastructure/adapters/`
3. Implement `DatabaseAdapterPort` interface
4. Add Tauri commands in `apps/desktop/src-tauri/src/commands/`
5. Update UI components if needed
6. Write tests

---

## Quick Reference

```
✅ MUST: Return types | await promises | const | curly braces | ===
❌ NEVER: any | console.log | floating promises | var | secrets in code
LIMITS: 5 params | 100 lines | 4 depth | 15 complexity
COMMANDS: pnpm format → pnpm lint → pnpm test → pnpm build
DESKTOP: pnpm dev:desktop | WEB: pnpm dev:web
```
