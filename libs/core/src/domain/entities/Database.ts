import { DatabaseType } from "../value-objects/DatabaseType"

/**
 * Database entity - represents a database within a connection
 */
export interface Database {
    name: string
    type: DatabaseType
    sizeBytes?: number
    collectionCount?: number
    isEmpty?: boolean
}

/**
 * Create a database entity
 */
export function createDatabase(
    name: string,
    type: DatabaseType,
    options?: Partial<Omit<Database, "name" | "type">>,
): Database {
    return {
        name,
        type,
        ...options,
    }
}

/**
 * MongoDB ships three databases that hold cluster-wide metadata rather
 * than user data: `admin` for users/roles/replication, `config` for
 * sharding catalogue, `local` for the oplog and replica-set state.
 *
 * Frozen so a runtime mutation can't quietly hide a real user database
 * by misclassifying it as a system one.
 */
export const MONGO_SYSTEM_DATABASES: ReadonlySet<string> = new Set(["admin", "config", "local"])

/**
 * Whether the database is one of the engine's internal / metadata
 * databases. The UI uses this to dim or collapse the system row by
 * default — destructive actions (drop, rename, export) are still
 * allowed but we don't lead with them.
 *
 * Redis doesn't have named databases, only numbered ones (0–15), so
 * for Redis this is always `false`.
 */
export function isSystemDatabase(database: Database): boolean {
    if (database.type === DatabaseType.MongoDB) {
        return MONGO_SYSTEM_DATABASES.has(database.name)
    }
    return false
}
