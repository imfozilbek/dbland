import { DatabaseType } from "../value-objects/DatabaseType"

/**
 * Index information for a collection
 */
export interface CollectionIndex {
    name: string
    keys: Record<string, number | string>
    unique?: boolean
    sparse?: boolean
    background?: boolean
}

/**
 * Collection statistics
 */
export interface CollectionStats {
    documentCount: number
    sizeBytes: number
    avgDocumentSize?: number
    indexCount?: number
    totalIndexSize?: number
}

/**
 * Collection entity - represents a collection/table within a database
 */
export interface Collection {
    name: string
    databaseName: string
    type: DatabaseType
    stats?: CollectionStats
    indexes?: CollectionIndex[]
    capped?: boolean
    maxDocuments?: number
    maxSize?: number
}

/**
 * Create a collection entity
 */
export function createCollection(
    name: string,
    databaseName: string,
    type: DatabaseType,
    options?: Partial<Omit<Collection, "name" | "databaseName" | "type">>,
): Collection {
    return {
        name,
        databaseName,
        type,
        ...options,
    }
}

/**
 * MongoDB stores its internal book-keeping in collections that live
 * under the `system.` prefix (`system.indexes`, `system.users`,
 * `system.profile`, …). Touching them by hand corrupts metadata in
 * subtle ways the user can't easily roll back.
 *
 * The UI uses this to hide system collections by default — drop /
 * rename / clone are still reachable in an "advanced" view, but we
 * don't dangle the loaded gun in front of the user.
 */
export function isSystemCollection(collection: Collection): boolean {
    if (collection.type === DatabaseType.MongoDB) {
        return collection.name.startsWith("system.")
    }
    return false
}
