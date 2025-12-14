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
 * Get default port for a database type
 */
export function getDefaultPort(type: DatabaseType): number {
    const defaultPorts: Record<DatabaseType, number> = {
        [DatabaseType.MongoDB]: 27017,
        [DatabaseType.Redis]: 6379,
    }
    return defaultPorts[type]
}
