# Tauri Backend

Rust backend for DBLand Desktop Application using Tauri 2.0.

## Tech Stack

- **Tauri 2.0** - Desktop framework
- **Rust** - Backend language
- **tokio** - Async runtime

## Structure

```
src/
├── main.rs              # Entry point
├── lib.rs               # Library exports
└── commands/
    ├── mod.rs           # Commands module
    ├── connection.rs    # Connection commands
    ├── schema.rs        # Schema commands
    └── query.rs         # Query commands
```

## Commands

### Connection

- `connect` - Connect to database
- `disconnect` - Disconnect from database
- `test_connection` - Test connection

### Schema

- `get_databases` - List databases
- `get_collections` - List collections
- `get_schema` - Get collection schema

### Query

- `execute_query` - Execute query
- `get_documents` - Get documents

## Development

```bash
# Build
cargo build

# Run (with React frontend)
pnpm dev:tauri

# Check
cargo check

# Format
cargo fmt

# Lint
cargo clippy
```

## Requirements

- Rust (install via rustup)
- Tauri CLI: `cargo install tauri-cli`

## License

MIT
