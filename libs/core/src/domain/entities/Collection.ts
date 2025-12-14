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
