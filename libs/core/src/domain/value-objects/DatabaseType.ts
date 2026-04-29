/**
 * Supported database types
 */
export enum DatabaseType {
    MongoDB = "mongodb",
    Redis = "redis",
    // Future
    // PostgreSQL = "postgresql",
    // MySQL = "mysql",
    // SQLite = "sqlite",
}

/**
 * Check if a string is a valid DatabaseType
 */
export function isDatabaseType(value: string): value is DatabaseType {
    return Object.values(DatabaseType).includes(value as DatabaseType)
}

/**
 * Get display name for a database type
 */
export function getDatabaseTypeDisplayName(type: DatabaseType): string {
    const displayNames: Record<DatabaseType, string> = {
        [DatabaseType.MongoDB]: "MongoDB",
        [DatabaseType.Redis]: "Redis",
    }
    return displayNames[type]
}

/**
 * Default port lookup intentionally lives in
 * `domain/constants/database-defaults` (`DEFAULT_PORTS`) — it's the
 * single source of truth for engine ports, shared with the Rust side
 * of the IPC. The earlier copy here re-stated the same numbers and
 * went stale every time someone updated the constants file. Importers
 * should reach for `DEFAULT_PORTS[type]` directly; the previous
 * `getDefaultPort` function was a thin re-export with no callers.
 */
