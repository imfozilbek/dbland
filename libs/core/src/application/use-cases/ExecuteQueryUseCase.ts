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
 * Build the standard "fail-fast" output shape for the four pre-flight
 * gates (empty query, no adapter, not connected, language mismatch).
 * Centralised so the use case's main `execute` method stays under the
 * `max-lines-per-function` cap and the guards share a single shape —
 * not four slightly-different copies that drift over time.
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
 * Build the output for a normal adapter response — either success or
 * `success: false` with an error attached. Pulls history-entry creation
 * and event emission out of `execute` so the orchestrator stays under
 * the line cap and reads as a flat sequence of guards + outcomes.
 */
function recordCompletion(
    input: ExecuteQueryInput,
    result: QueryResult,
    executionTimeMs: number,
): ExecuteQueryOutput {
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

    const event = result.success
        ? createQueryExecutedEvent(input.connectionId, input.query, result, {
              databaseName: input.databaseName,
              collectionName: input.collectionName,
          })
        : createQueryFailedEvent(input.connectionId, input.query, result.error ?? "Unknown error")

    return { success: result.success, result, historyEntry, events: [event] }
}

/**
 * Wrap a thrown adapter exception into the standard output shape. The
 * driver-side error message is propagated verbatim — by the time it
 * reaches this layer it has already passed through the IPC redactor,
 * so embedded URIs / passwords are stripped.
 */
function recordException(
    input: ExecuteQueryInput,
    error: unknown,
    executionTimeMs: number,
): ExecuteQueryOutput {
    const errorMessage = error instanceof Error ? error.message : String(error)
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
    return {
        success: false,
        result,
        historyEntry,
        events: [createQueryFailedEvent(input.connectionId, input.query, errorMessage)],
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
        const startTime = Date.now()

        // Reject empty / whitespace-only queries before any adapter
        // round trip. The adapter would also fail, but vendor parsers
        // surface this as anything from "syntax error at position 0"
        // (Mongo) to a hung WAITRESP (Redis) — landing here lets the UI
        // show a clear "type something first" message and avoids a
        // misleading history entry that looks like a real failed query.
        if (input.query.trim().length === 0) {
            return failFast(input.connectionId, input.query, input.language, "Query is empty")
        }

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
            return recordCompletion(input, result, Date.now() - startTime)
        } catch (error) {
            return recordException(input, error, Date.now() - startTime)
        }
    }
}
