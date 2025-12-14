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
