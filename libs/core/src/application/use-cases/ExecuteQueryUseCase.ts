import {
    createQueryHistoryEntry,
    getQueryLanguage,
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
 * Build the standard "fail-fast" output shape for the three pre-flight
 * gates (no adapter, not connected, language mismatch). Centralised
 * here so the use case's main `execute` method stays under the
 * `max-lines-per-function` cap and the three guards share a single
 * shape — not three slightly-different copies that drift over time.
 */
function failFast(
    connectionId: string,
    query: string,
    language: QueryLanguage,
    error: string,
): ExecuteQueryOutput {
    const result = createErrorQueryResult(error)
    const historyEntry = createQueryHistoryEntry(query, language, 0, false, { error })
    return {
        success: false,
        result,
        historyEntry,
        events: [createQueryFailedEvent(connectionId, query, error)],
    }
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
            return failFast(
                input.connectionId,
                input.query,
                input.language,
                `No active connection: ${input.connectionId}`,
            )
        }

        if (!adapter.isConnected) {
            return failFast(
                input.connectionId,
                input.query,
                input.language,
                "Connection is not active",
            )
        }

        // Reject obvious cross-engine query/connection mismatches before
        // spending a network round trip on it. Sending a Mongo `find`
        // payload to a Redis adapter (or vice versa) used to leak through
        // and surface as a vendor parser error from the wire — typed
        // gate here means the UI gets a clear "you picked the wrong
        // editor language" signal instead.
        const expectedLanguage = getQueryLanguage(adapter.type)
        if (input.language !== expectedLanguage) {
            this.logger.warn("Query language mismatch", {
                connectionId: input.connectionId,
                expected: expectedLanguage,
                got: input.language,
            })
            return failFast(
                input.connectionId,
                input.query,
                input.language,
                `Query language ${input.language} is not compatible with ${adapter.type} connection (expected ${expectedLanguage})`,
            )
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
