# @dbland/core

Database abstraction layer for DBLand using Domain-Driven Design (DDD).

## Installation

```bash
pnpm add @dbland/core
```

## Architecture

```
src/
├── domain/              # Pure domain logic
│   ├── entities/        # Connection, Database, Collection, Query, Document
│   ├── value-objects/   # DatabaseType, ConnectionConfig, Credentials, QueryResult
│   └── events/          # ConnectionEvents, QueryEvents
├── application/         # Use cases
│   ├── use-cases/       # ConnectToDatabase, ExecuteQuery, GetSchema
│   └── ports/           # DatabaseAdapterPort, ConnectionStoragePort
└── infrastructure/      # External integrations (adapters)
```

## Usage

```typescript
import {
    DatabaseType,
    ConnectionConfig,
    DatabaseAdapterPort,
} from "@dbland/core"

const config = ConnectionConfig.create({
    type: DatabaseType.MongoDB,
    host: "localhost",
    port: 27017,
    database: "mydb",
})
```

## API

### Value Objects

- `DatabaseType` - Enum: MongoDB, Redis, PostgreSQL, MySQL, SQLite
- `ConnectionConfig` - Database connection configuration
- `Credentials` - Authentication credentials
- `QueryResult` - Query execution result

### Entities

- `Connection` - Database connection entity
- `Database` - Database entity
- `Collection` - Collection/Table entity
- `Document` - Document/Row entity
- `Query` - Query entity

### Ports

- `DatabaseAdapterPort` - Interface for database adapters
- `ConnectionStoragePort` - Interface for connection storage

### Use Cases

- `ConnectToDatabaseUseCase` - Connect to a database
- `ExecuteQueryUseCase` - Execute a query
- `GetSchemaUseCase` - Get database schema

## Development

```bash
# Build
pnpm build

# Test
pnpm test:run

# Watch mode
pnpm test:watch
```

## License

MIT
