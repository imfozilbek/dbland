import { DatabaseType } from "../value-objects/DatabaseType"

/**
 * Query language type
 */
export enum QueryLanguage {
    MongoDB = "mongodb",
    RedisCLI = "redis-cli",
}

/**
 * Query entity - represents a saved or executed query
 */
export interface Query {
    id: string
    name?: string
    query: string
    language: QueryLanguage
    databaseName?: string
    collectionName?: string
    createdAt: Date
    executedAt?: Date
    executionTimeMs?: number
    isFavorite?: boolean
    tags?: string[]
}

/**
 * Query history entry
 */
export interface QueryHistoryEntry {
    id: string
    query: string
    language: QueryLanguage
    databaseName?: string
    collectionName?: string
    executedAt: Date
    executionTimeMs: number
    success: boolean
    resultCount?: number
    error?: string
}

/**
 * Saved query (snippet)
 */
export interface SavedQuery extends Query {
    name: string
    description?: string
    variables?: Record<string, unknown>
}

/**
 * Get query language for database type
 */
export function getQueryLanguage(type: DatabaseType): QueryLanguage {
    switch (type) {
        case DatabaseType.MongoDB:
            return QueryLanguage.MongoDB
        case DatabaseType.Redis:
            return QueryLanguage.RedisCLI
        default:
            return QueryLanguage.MongoDB
    }
}

/**
 * Create a new query
 */
export function createQuery(
    queryText: string,
    language: QueryLanguage,
    options?: Partial<Omit<Query, "id" | "query" | "language" | "createdAt">>,
): Query {
    return {
        id: crypto.randomUUID(),
        query: queryText,
        language,
        createdAt: new Date(),
        ...options,
    }
}

/**
 * Create a query history entry
 */
export function createQueryHistoryEntry(
    query: string,
    language: QueryLanguage,
    executionTimeMs: number,
    success: boolean,
    options?: Partial<
        Omit<
            QueryHistoryEntry,
            "id" | "query" | "language" | "executedAt" | "executionTimeMs" | "success"
        >
    >,
): QueryHistoryEntry {
    return {
        id: crypto.randomUUID(),
        query,
        language,
        executedAt: new Date(),
        executionTimeMs,
        success,
        ...options,
    }
}
