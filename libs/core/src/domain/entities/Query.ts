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
 * Whether the query's language is compatible with the connection's
 * database type. Returns `false` for the obvious mismatch (Mongo query
 * sent to a Redis connection or vice versa) so the calling use case
 * can short-circuit with a typed `QueryError.languageMismatch` instead
 * of letting the adapter throw a vendor parser error.
 */
export function canRunAgainst(query: Query, connectionType: DatabaseType): boolean {
    return query.language === getQueryLanguage(connectionType)
}

/**
 * Default slow-query threshold in milliseconds. Anything that takes
 * longer is worth surfacing in the history view's "slow ops" filter.
 * The constant lives at module scope so the same number drives the
 * `isSlow` predicate, the UI's badge colouring, and any future
 * exporter — keeping it single-sourced.
 */
export const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 1000

/**
 * Whether a recorded query took long enough to qualify as "slow".
 * Lets a UI / store branch on a single semantic without each surface
 * picking its own arbitrary threshold. Pass an explicit threshold to
 * override the default for a particular caller (e.g. the profiler
 * panel where the user has dialled it down to 100ms).
 */
export function isSlow(
    entry: QueryHistoryEntry,
    thresholdMs: number = DEFAULT_SLOW_QUERY_THRESHOLD_MS,
): boolean {
    return entry.executionTimeMs >= thresholdMs
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
