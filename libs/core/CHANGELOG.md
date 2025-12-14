# @dbland/core Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-01-15

### Added

- Domain layer with DDD structure
  - Entities: Connection, Database, Collection, Document, Query
  - Value Objects: DatabaseType, ConnectionConfig, Credentials, QueryResult
  - Events: ConnectionEvents, QueryEvents
- Application layer
  - Ports: DatabaseAdapterPort, ConnectionStoragePort
  - Use Cases: ConnectToDatabaseUseCase, ExecuteQueryUseCase, GetSchemaUseCase
- Unit tests (18 tests)
  - DatabaseType tests
  - ConnectionConfig tests
  - Connection entity tests
