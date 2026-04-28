import {
    createQueryHistoryEntry,
    QueryHistoryEntry,
    QueryLanguage,
} from "../../domain/entities/Query"
import {
    createQueryExecutedEvent,
    createQueryFailedEvent,
    QueryExecutedEvent,
    QueryFailedEvent,
} from "../../domain/events/QueryEvents"
import { createErrorQueryResult, QueryResult } from "../../domain/value-objects/QueryResult"
import { DatabaseAdapterPort } from "../ports/DatabaseAdapterPort"
import { LoggerPort, NoopLogger } from "../ports/LoggerPort"

/**
 * Execute query use case input
 */
export interface ExecuteQueryInput {
    connectionId: string
    query: string
    databaseName?: string
    collectionName?: string
    language: QueryLanguage
}

/**
 * Execute query use case output
 */
export interface ExecuteQueryOutput {
    success: boolean
    result: QueryResult
    historyEntry: QueryHistoryEntry
    events: (QueryExecutedEvent | QueryFailedEvent)[]
}

/**
 * Execute query use case
 */
export class ExecuteQueryUseCase {
    private readonly logger: LoggerPort

    constructor(
        private readonly getAdapter: (connectionId: string) => DatabaseAdapterPort | undefined,
        logger?: LoggerPort,
    ) {
        this.logger = logger?.child?.({ useCase: "ExecuteQuery" }) ?? NoopLogger
    }

    async execute(input: ExecuteQueryInput): Promise<ExecuteQueryOutput> {
        const events: (QueryExecutedEvent | QueryFailedEvent)[] = []
        const startTime = Date.now()

        // Get adapter for this connection
        const adapter = this.getAdapter(input.connectionId)
        if (!adapter) {
            const error = `No active connection: ${input.connectionId}`
            const result = createErrorQueryResult(error)
            const historyEntry = createQueryHistoryEntry(input.query, input.language, 0, false, {
                error,
            })

            events.push(createQueryFailedEvent(input.connectionId, input.query, error))

            return {
                success: false,
                result,
                historyEntry,
                events,
            }
        }

        if (!adapter.isConnected) {
            const error = "Connection is not active"
            const result = createErrorQueryResult(error)
            const historyEntry = createQueryHistoryEntry(input.query, input.language, 0, false, {
                error,
            })

            events.push(createQueryFailedEvent(input.connectionId, input.query, error))

            return {
                success: false,
                result,
                historyEntry,
                events,
            }
        }

        try {
            // Execute query — pass language explicitly so the adapter can
            // route to the right parser and reject obvious mismatches with
            // a typed error rather than a vendor stack trace.
            const result = await adapter.executeQuery(
                input.query,
                input.language,
                input.databaseName,
                input.collectionName,
            )

            const executionTimeMs = Date.now() - startTime

            // Create history entry
            const historyEntry = createQueryHistoryEntry(
                input.query,
                input.language,
                executionTimeMs,
                result.success,
                {
                    databaseName: input.databaseName,
                    collectionName: input.collectionName,
                    resultCount: result.documents.length,
                    error: result.error,
                },
            )

            if (result.success) {
                events.push(
                    createQueryExecutedEvent(input.connectionId, input.query, result, {
                        databaseName: input.databaseName,
                        collectionName: input.collectionName,
                    }),
                )
            } else {
                events.push(
                    createQueryFailedEvent(
                        input.connectionId,
                        input.query,
                        result.error ?? "Unknown error",
                    ),
                )
            }

            return {
                success: result.success,
                result,
                historyEntry,
                events,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const executionTimeMs = Date.now() - startTime
            const result = createErrorQueryResult(errorMessage)

            const historyEntry = createQueryHistoryEntry(
                input.query,
                input.language,
                executionTimeMs,
                false,
                {
                    databaseName: input.databaseName,
                    collectionName: input.collectionName,
                    error: errorMessage,
                },
            )

            events.push(createQueryFailedEvent(input.connectionId, input.query, errorMessage))

            return {
                success: false,
                result,
                historyEntry,
                events,
            }
        }
    }
}
