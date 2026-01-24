# Contributing to DBLand

Thank you for your interest in contributing to DBLand! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- Rust (stable)
- pnpm 8.x

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/samiyev/dbland.git
cd dbland
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the desktop app in development mode:
```bash
pnpm dev:desktop
```

4. Run the web app in development mode:
```bash
pnpm dev:web
```

## Project Structure

```
dbland/
├── apps/
│   ├── desktop/          # Tauri desktop app
│   │   ├── src/          # React frontend
│   │   └── src-tauri/    # Rust backend
│   └── web/              # Web app
├── packages/
│   └── ui/               # Shared React components
├── libs/
│   └── core/             # Domain logic and adapters
└── docs/                 # Documentation
```

## Development Workflow

### 1. Find an Issue

- Check [existing issues](https://github.com/samiyev/dbland/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Or create a new issue to discuss your idea

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions/changes

### 3. Make Your Changes

Follow our coding standards:

#### Code Style

- **Indentation**: 4 spaces
- **No semicolons** in TypeScript
- **Double quotes** for strings
- **Line length**: Max 100 characters
- **Trailing commas**: Always

Format code before committing:
```bash
pnpm format
```

#### TypeScript

- Always specify return types for functions
- Avoid `any` type - use `unknown` or proper types
- Use `const` unless reassigning
- Always use `===` and `!==`
- Handle promises with `await` or `.catch()`

#### Architecture

Follow Clean Architecture and DDD principles:

- **Domain Layer**: Entities, Value Objects (no framework imports)
- **Application Layer**: Use Cases, Ports (interfaces)
- **Infrastructure Layer**: Adapters, Controllers, Repositories

Example:
```typescript
// Domain (pure business logic)
export interface User {
    id: string
    email: string
    createdAt: Date
}

// Application (use case)
export interface UserRepository {
    findById(id: string): Promise<User | null>
}

// Infrastructure (implementation)
export class MongoUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        // MongoDB-specific implementation
    }
}
```

### 4. Write Tests

- Aim for 90% coverage in domain layer
- Aim for 80% coverage in application layer
- Write unit tests for business logic
- Write integration tests for adapters

Run tests:
```bash
pnpm test
```

Run tests with coverage:
```bash
pnpm test:coverage
```

### 5. Commit Your Changes

Use conventional commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build, dependencies, tooling

Examples:
```bash
git commit -m "feat(ui): add dark mode toggle"
git commit -m "fix(mongodb): resolve connection timeout issue"
git commit -m "docs: update installation instructions"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a pull request with:
- Clear title and description
- Link to related issue (e.g., "Closes #123")
- Screenshots/GIFs for UI changes
- Test results

## Adding a New Database Adapter

To add support for a new database:

1. **Create adapter interface** in `libs/core/src/domain/ports/`:
```typescript
export interface NewDbPort {
    connect(config: ConnectionConfig): Promise<void>
    executeQuery(query: string): Promise<QueryResult>
}
```

2. **Implement adapter** in `apps/desktop/src-tauri/src/adapters/`:
```rust
pub struct NewDbAdapter {
    config: NewDbConfig,
    connection: Option<Connection>,
}

impl DatabaseAdapter for NewDbAdapter {
    // Implementation
}
```

3. **Add Tauri commands** in `apps/desktop/src-tauri/src/commands/`:
```rust
#[command]
pub async fn newdb_query(
    state: State<'_, Arc<AppState>>,
    query: String,
) -> Result<QueryResult, String> {
    // Implementation
}
```

4. **Create UI components** in `packages/ui/src/components/newdb/`:
```typescript
export function NewDbQueryEditor() {
    // Component implementation
}
```

5. **Update documentation** with new database support

## Testing Guidelines

### Unit Tests

Test business logic in isolation:

```typescript
describe("UserValidator", () => {
    it("should validate email format", () => {
        const result = validateEmail("invalid-email")
        expect(result.isValid).toBe(false)
    })
})
```

### Integration Tests

Test adapter integrations:

```typescript
describe("MongoDbAdapter", () => {
    it("should connect to database", async () => {
        const adapter = new MongoDbAdapter(config)
        await adapter.connect()
        expect(adapter.isConnected()).toBe(true)
    })
})
```

### E2E Tests

Test full user workflows (future):

```typescript
test("user can create and execute a query", async () => {
    await openApp()
    await createConnection()
    await openQueryEditor()
    await typeQuery("db.users.find({})")
    await executeQuery()
    await expectResults()
})
```

## UI Development Guidelines

### Component Structure

```typescript
interface MyComponentProps {
    title: string
    onAction: () => void
}

export function MyComponent({ title, onAction }: MyComponentProps): JSX.Element {
    const [state, setState] = useState("")

    return (
        <div>
            <h1>{title}</h1>
            <button onClick={onAction}>Action</button>
        </div>
    )
}
```

### State Management

Use Zustand for global state:

```typescript
import { create } from "zustand"

interface MyStore {
    count: number
    increment: () => void
}

export const useMyStore = create<MyStore>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

## Documentation

- Update README.md if adding new features
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)
- Add JSDoc comments for public APIs
- Create/update user guides in `docs/`

## Release Process

1. Update version in all package.json files
2. Update CHANGELOG.md with release notes
3. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will automatically build and release

## Getting Help

- Ask questions in [Discussions](https://github.com/samiyev/dbland/discussions)
- Report bugs in [Issues](https://github.com/samiyev/dbland/issues)
- Join our community chat (coming soon)

## License

By contributing to DBLand, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
