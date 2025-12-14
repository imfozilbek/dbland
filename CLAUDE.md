# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**DBLand** is a NoSQL database agnostic GUI/WEB client — the open-source alternative to Studio 3T.

**Platform-first approach**: Core library handles database abstraction, Desktop and Web apps provide the UI.

Supports: MongoDB, Redis. Future: Elasticsearch, Cassandra, CouchDB, DynamoDB, Neo4j, InfluxDB, ScyllaDB, ArangoDB.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          DBLAND                                  │
├─────────────────────────────────────────────────────────────────┤
│  packages/              │  apps/                                │
│  (Shared Libraries)     │  (Applications)                       │
│  ─────────────────────  │  ──────────────────────────────────── │
│  @dbland/ui             │  desktop/ ──► Tauri 2.0 + React       │
│  (React components)     │  web/ ─────► React + Vite             │
│                         │                                        │
│  libs/                  │  Both apps use:                        │
│  @dbland/core           │  - @dbland/ui (shared components)     │
│  (DB abstraction, DDD)  │  - @dbland/core (business logic)      │
└─────────────────────────────────────────────────────────────────┘
```

### How it works

```
User → Desktop/Web App → @dbland/ui → @dbland/core → Database Adapters → MongoDB/Redis
```

Desktop app uses native Rust drivers via Tauri. Web app uses WebSocket proxy.

## Project Structure

```
dbland/
├── packages/                    # Shared React libraries
│   └── ui/                      # @dbland/ui - React components
│
├── libs/                        # Internal shared libraries
│   └── core/                    # @dbland/core - Database abstraction (DDD)
│
├── apps/                        # Applications
│   ├── desktop/                 # @dbland/desktop - Tauri 2.0 + React
│   │   ├── src/                 # React frontend
│   │   └── src-tauri/           # Rust backend
│   └── web/                     # @dbland/web - React + Vite
│
├── CLAUDE.md
├── ROADMAP.md
├── TODO.md
├── CHANGELOG.md
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Key Paths

| Description | Path |
|-------------|------|
| **Root** | `/Users/fozilbeksamiyev/projects/dbland` |
| **Core (internal)** | `libs/core` |
| **UI Components** | `packages/ui` |
| **Desktop App** | `apps/desktop` |
| **Tauri Backend** | `apps/desktop/src-tauri` |
| **Web App** | `apps/web` |

## Essential Commands

```bash
# Install all dependencies
pnpm install

# Build everything
pnpm build

# Build specific package/app
pnpm --filter @dbland/core build
pnpm --filter @dbland/ui build
pnpm --filter @dbland/desktop build

# Run Desktop App (Tauri)
pnpm dev:desktop

# Run Web App
pnpm dev:web

# Run tests
pnpm test

# Format code
pnpm format

# Lint code
pnpm lint
```

## Code Style

- **Indentation:** 4 spaces
- **Quotes:** Double quotes
- **Semicolons:** Never
- **Line Length:** 100 chars max

## Lint Rules (MUST follow)

### Formatting (Prettier)
```
tabWidth: 4           // 4 spaces
semi: false           // no semicolons
singleQuote: false    // double quotes "
trailingComma: "all"  // trailing commas in multiline
arrowParens: "always" // (x) => x, not x => x
printWidth: 100       // max line length
```

### TypeScript (errors — must fix)
| Rule | Meaning |
|------|---------|
| `no-floating-promises` | Always `await` or handle promises |
| `await-thenable` | Only `await` promises, not regular values |
| `no-misused-promises` | Don't pass promises where not expected |
| `no-unused-vars` | Remove unused variables (prefix with `_` to ignore) |

### TypeScript (warnings — should fix)
| Rule | Meaning |
|------|---------|
| `explicit-function-return-type` | Always specify return type: `function foo(): string` |
| `explicit-module-boundary-types` | Exported functions must have explicit types |
| `no-explicit-any` | Avoid `any`, use `unknown` or specific type |
| `no-unsafe-*` | Avoid unsafe operations with `any` types |
| `prefer-optional-chain` | Use `a?.b` instead of `a && a.b` |
| `prefer-readonly` | Mark properties as `readonly` when possible |
| `promise-function-async` | Functions returning Promise should be `async` |
| `require-await` | `async` functions should have `await` |
| `no-non-null-assertion` | Avoid `value!`, use proper null checks |

### Code Quality (errors)
| Rule | Meaning |
|------|---------|
| `eqeqeq` | Use `===` and `!==`, never `==` or `!=` |
| `curly` | Always use braces: `if (x) { return }` |
| `no-var` | Use `const`/`let`, never `var` |
| `prefer-const` | Use `const` if variable is never reassigned |
| `no-debugger` | Remove `debugger` statements |
| `no-duplicate-imports` | Combine imports from same module |

### Code Quality (warnings)
| Rule | Meaning |
|------|---------|
| `no-console` | Use `console.warn`/`console.error` only, no `console.log` |
| `prefer-template` | Use template literals: `` `Hello ${name}` `` |
| `no-else-return` | No `else` after `return` |
| `prefer-arrow-callback` | Use arrow functions for callbacks |

### Complexity Limits (warnings)
| Rule | Limit | Note |
|------|-------|------|
| `complexity` | 15 | Max cyclomatic complexity |
| `max-depth` | 4 | Max nesting level |
| `max-lines-per-function` | 100 | Excluding blanks/comments |
| `max-params` | 5 | (8 for DDD value objects/use cases) |

### Quick Reference
```typescript
// ✅ Good
async function getConnection(id: string): Promise<Connection> {
    const conn = await connectionRepo.findById(id)
    if (!conn) {
        throw new Error("Connection not found")
    }
    return conn
}

// ❌ Bad
async function getConnection(id) {        // missing types
    const conn = connectionRepo.findById(id)  // missing await
    if (!conn)                      // missing curly braces
        throw new Error("Connection not found")
    console.log(conn)               // no console.log
    return conn
}
```

## Core Library Structure (libs/core)

```
libs/core/src/
├── domain/              # Pure domain logic
│   ├── entities/        # Connection, Database, Collection, Query
│   ├── value-objects/   # DatabaseType, ConnectionConfig, Credentials
│   └── events/          # ConnectionEstablished, QueryExecuted
├── application/         # Use cases
│   ├── use-cases/       # ConnectToDatabase, ExecuteQuery, GetSchema
│   └── ports/           # DatabaseAdapterPort, ConnectionStoragePort
└── infrastructure/      # External integrations
    └── adapters/        # MongoDBAdapter, RedisAdapter
```

### DatabaseAdapterPort Interface

Each database adapter implements this interface:

```typescript
interface DatabaseAdapterPort {
    type: DatabaseType
    connect(config: ConnectionConfig): Promise<void>
    disconnect(): Promise<void>
    testConnection(): Promise<boolean>
    getDatabases(): Promise<Database[]>
    getCollections(database: string): Promise<Collection[]>
    executeQuery(query: string): Promise<QueryResult>
    exportData(options: ExportOptions): Promise<Blob>
    importData(data: Blob, options: ImportOptions): Promise<void>
}
```

## UI Components Structure (packages/ui)

```
packages/ui/src/
├── components/
│   ├── ui/                  # Base components (Radix UI + Tailwind)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── query-editor/        # Monaco Editor wrapper
│   ├── results-viewer/      # Table/JSON/Tree views
│   ├── schema-browser/      # Database tree
│   ├── connection-manager/  # Connection dialogs
│   └── document-editor/     # Document editing
├── hooks/
├── lib/
│   └── utils.ts             # cn() helper
└── index.ts
```

## Git Commit Format

Follow Conventional Commits format.

**Monorepo format:** `<type>(<scope>): <subject>`

Examples:
- `feat(core): add mongodb adapter`
- `fix(ui): resolve tree node collapse issue`
- `docs(desktop): update readme`
- `refactor(core): extract connection entity`

**Root-level changes:** `<type>: <subject>` (no scope)
- `chore: update eslint config`
- `docs: update root README`

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

**Scopes:** core, ui, desktop, web, tauri

**Rules:**
- Imperative mood, no caps, max 50 chars
- Do NOT add "Generated with Claude Code" footer
- Do NOT add "Co-Authored-By: Claude"

## Monorepo Versioning Strategy

### Git Tag Format

**Prefixed tags for each package:**
```
core-v0.1.0
ui-v0.1.0
desktop-v0.1.0
web-v0.1.0
```

### Semantic Versioning

All packages follow SemVer: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features, backwards compatible
- **PATCH** (0.0.1) - Bug fixes, backwards compatible

**Pre-1.0 policy:** Minor bumps (0.x.0) may include breaking changes.

## Release Pipeline

**Quick reference:** Say "run pipeline for [package]" to execute full release flow.

The pipeline has 5 phases. Each phase must pass before proceeding.

### Phase 1: Quality Gates

```bash
cd packages/<package>  # or libs/core, apps/desktop

# All must pass:
pnpm format                              # 4-space indentation
pnpm build                               # TypeScript compiles
cd ../.. && pnpm lint                    # 0 errors, 0 warnings
cd packages/<package>
pnpm test:run                            # All tests pass
```

### Phase 2: Documentation

Update these files in the package directory:

| File | Action |
|------|--------|
| `README.md` | Add feature docs, update usage |
| `TODO.md` | Mark completed tasks, add new tech debt if any |
| `CHANGELOG.md` | Add version entry with all changes |
| `ROADMAP.md` | Update if milestone completed |

### Phase 3: Manual Testing

```bash
# Test manually
# Verify output, edge cases, error handling
```

### Phase 4: Commit

```bash
git add .
git commit -m "<type>(<scope>): <description>"
```

### Phase 5: Version & Tag

```bash
cd packages/<package>

npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

git tag <scope>-v<version>
git push origin main
git push origin <scope>-v<version>
```

## Working with ROADMAP

When the user points to `ROADMAP.md` or asks about the roadmap/next steps:

1. **Read both files together:**
   - `<package>/ROADMAP.md` - to understand the planned features and milestones
   - `<package>/CHANGELOG.md` - to see what's already implemented

2. **Determine current position:**
   - Check the latest version in CHANGELOG.md
   - Cross-reference with ROADMAP.md milestones
   - Identify which roadmap items are already completed

3. **Suggest next steps:**
   - Find the first uncompleted item in the current milestone
   - Present clear "start here" recommendation

## Working with TODO

TODO.md tracks technical debt and pending improvements:

- **Add items** when you notice shortcuts, hacks, or improvements needed
- **Mark completed** when tech debt is resolved
- **Prioritize** items that block other work

## Adding New Database Adapter

1. Add to `DatabaseType` enum in `libs/core/src/domain/value-objects/DatabaseType.ts`
2. Create adapter in `libs/core/src/infrastructure/adapters/`
3. Implement `DatabaseAdapterPort` interface
4. Add Tauri commands in `apps/desktop/src-tauri/src/commands/`
5. Update UI components if needed
6. Write tests

## Dependency Graph

```
┌─────────────────────────────────────────────────┐
│                    apps/                         │
│  ┌──────────────┐  ┌──────────────┐             │
│  │   desktop    │  │     web      │             │
│  │ (Tauri+React)│  │ (React+Vite) │             │
│  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                     │
│         └────────┬─────────┘                     │
│                  ▼                               │
│         ┌──────────────┐                         │
│         │  packages/ui  │                         │
│         │ (React comps) │                         │
│         └──────┬───────┘                         │
│                │                                 │
│                ▼                                 │
│         ┌──────────────┐                         │
│         │  libs/core   │                         │
│         │ (DB abstraction)│                      │
│         └──────────────┘                         │
└─────────────────────────────────────────────────┘
```

## Important Notes

- Node.js >= 22.0.0 required (check `.nvmrc`)
- Rust required for Tauri (install via rustup)
- Always run `pnpm format` before committing
- Build `libs/core` first when making shared changes
- Never commit database credentials
