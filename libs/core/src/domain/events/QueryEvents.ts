import { QueryResult } from "../value-objects/QueryResult"
import { DomainEvent } from "./ConnectionEvents"

/**
 * Query executed event
 */
export interface QueryExecutedEvent extends DomainEvent<{
    connectionId: string
    databaseName?: string
    collectionName?: string
    query: string
    result: QueryResult
}> {
    type: "query.executed"
}

/**
 * Query failed event
 */
export interface QueryFailedEvent extends DomainEvent<{
    connectionId: string
    query: string
    error: string
}> {
    type: "query.failed"
}

/**
 * Create query executed event
 */
export function createQueryExecutedEvent(
    connectionId: string,
    query: string,
    result: QueryResult,
    options?: { databaseName?: string; collectionName?: string },
): QueryExecutedEvent {
    return {
        type: "query.executed",
        payload: {
            connectionId,
            query,
            result,
            databaseName: options?.databaseName,
            collectionName: options?.collectionName,
        },
        timestamp: new Date(),
    }
}

/**
 * Create query failed event
 */
export function createQueryFailedEvent(
    connectionId: string,
    query: string,
    error: string,
): QueryFailedEvent {
    return {
        type: "query.failed",
        payload: { connectionId, query, error },
        timestamp: new Date(),
    }
}
