/**
 * A single document/row in the query result
 */
export interface ResultDocument {
    _id?: string
    [key: string]: unknown
}

/**
 * Query execution statistics
 */
export interface QueryStats {
    executionTimeMs: number
    documentsExamined?: number
    documentsReturned: number
    indexUsed?: string
    bytesRead?: number
}

/**
 * Result of a query execution
 */
export interface QueryResult {
    success: boolean
    documents: ResultDocument[]
    stats: QueryStats
    error?: string
    cursor?: {
        hasMore: boolean
        nextCursor?: string
    }
}

/**
 * Create an empty query result
 */
export function createEmptyQueryResult(): QueryResult {
    return {
        success: true,
        documents: [],
        stats: {
            executionTimeMs: 0,
            documentsReturned: 0,
        },
    }
}

/**
 * Create an error query result
 */
export function createErrorQueryResult(error: string): QueryResult {
    return {
        success: false,
        documents: [],
        stats: {
            executionTimeMs: 0,
            documentsReturned: 0,
        },
        error,
    }
}
