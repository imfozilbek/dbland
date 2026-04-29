import { DatabaseType } from "../value-objects/DatabaseType"

/**
 * Default port per database type. Sourced from each engine's official
 * documentation — these are not configuration, they're the published
 * convention every operator already expects.
 */
export const DEFAULT_PORTS: Record<DatabaseType, number> = {
    [DatabaseType.MongoDB]: 27017,
    [DatabaseType.Redis]: 6379,
} as const

/**
 * Default page size for queries that don't specify a limit. Matches the
 * fallback used in the Rust query command so behaviour is consistent
 * across the IPC boundary.
 */
export const DEFAULT_QUERY_LIMIT = 100

/**
 * Default host when no override is provided.
 */
export const DEFAULT_HOST = "localhost"

/**
 * Default Mongo auth database.
 */
export const DEFAULT_MONGO_AUTH_DATABASE = "admin"

/**
 * Default SSH port for tunnelled connections — the IANA-assigned 22.
 * Lives here next to the database defaults because the SSH tunnel is
 * always wrapped around a database connection and the UI configures
 * both as one form.
 */
export const DEFAULT_SSH_PORT = 22
