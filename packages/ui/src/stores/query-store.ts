import { create } from "zustand"
import type { PlatformAPI, QueryResult, ResultDocument } from "../contexts/PlatformContext"
import { formatQuery } from "../lib/query-formatter"

/**
 * Query language type
 */
export type QueryLanguage = "mongodb" | "redis"

/**
 * Results view mode
 */
export type ResultsViewMode = "table" | "json" | "tree"

/**
 * Query store state
 */
interface QueryState {
    // Platform API
    _api: PlatformAPI | null

    // Active query state
    activeQuery: string
    queryLanguage: QueryLanguage
    isExecuting: boolean

    // Results
    currentResult: QueryResult | null
    error: string | null

    // Results view settings
    resultsViewMode: ResultsViewMode

    // Autocomplete context (field names extracted from recent results)
    recentFields: Map<string, string[]>

    // Actions
    setApi: (api: PlatformAPI) => void
    setQuery: (query: string) => void
    setLanguage: (language: QueryLanguage) => void
    setResultsViewMode: (mode: ResultsViewMode) => void
    formatQuery: () => void
    executeQuery: (
        connectionId: string,
        databaseName?: string,
        collectionName?: string,
    ) => Promise<void>
    clearResult: () => void
    extractFieldsFromResult: (collectionName: string, result: QueryResult) => void
}

/**
 * Query store
 */
export const useQueryStore = create<QueryState>((set, get) => ({
    // Initial state
    _api: null,
    activeQuery: "",
    queryLanguage: "mongodb",
    isExecuting: false,
    currentResult: null,
    error: null,
    resultsViewMode: "table",
    recentFields: new Map(),

    // Set API
    setApi: (api: PlatformAPI): void => {
        set({ _api: api })
    },

    // Set query
    setQuery: (query: string): void => {
        set({ activeQuery: query })
    },

    // Set language
    setLanguage: (language: QueryLanguage): void => {
        set({ queryLanguage: language })
    },

    // Set results view mode
    setResultsViewMode: (mode: ResultsViewMode): void => {
        set({ resultsViewMode: mode })
    },

    // Format query
    formatQuery: (): void => {
        const { activeQuery, queryLanguage } = get()
        const formatted = formatQuery(activeQuery, queryLanguage)
        set({ activeQuery: formatted })
    },

    // Execute query
    executeQuery: async (
        connectionId: string,
        databaseName?: string,
        collectionName?: string,
    ): Promise<void> => {
        const { _api, activeQuery, isExecuting } = get()

        if (!_api) {
            set({ error: "Platform API not initialized" })
            return
        }

        // Drop the second click while a query is in flight. Without this
        // a Cmd-Enter spam (or a flaky touchpad) starts parallel
        // executions whose results race to overwrite each other in the
        // store — the user sees the wrong result for the query they
        // typed last. Mirrors the in-flight guard the connection-store
        // got in the previous iteration.
        if (isExecuting) {
            return
        }

        if (!activeQuery.trim()) {
            set({ error: "Query cannot be empty" })
            return
        }

        set({ isExecuting: true, error: null })

        try {
            const result = await _api.executeQuery(
                connectionId,
                activeQuery,
                databaseName,
                collectionName,
            )

            set({
                currentResult: result,
                isExecuting: false,
                error: result.success ? null : (result.error ?? "Query execution failed"),
            })

            // Extract field names for autocomplete if collection is specified
            if (result.success && collectionName) {
                get().extractFieldsFromResult(collectionName, result)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
            set({
                currentResult: null,
                isExecuting: false,
                error: errorMessage,
            })
        }
    },

    // Clear result
    clearResult: (): void => {
        set({ currentResult: null, error: null })
    },

    // Extract field names from result for autocomplete
    extractFieldsFromResult: (collectionName: string, result: QueryResult): void => {
        if (!result.documents.length) {
            return
        }

        const fields = new Set<string>()

        // Extract all unique field names from first 10 documents
        result.documents.slice(0, 10).forEach((doc: ResultDocument) => {
            Object.keys(doc).forEach((key) => {
                fields.add(key)
            })
        })

        set((state) => {
            const newRecentFields = new Map(state.recentFields)
            newRecentFields.set(collectionName, Array.from(fields))
            return { recentFields: newRecentFields }
        })
    },
}))

/**
 * Selectors
 */
export const selectActiveQuery = (state: QueryState): string => state.activeQuery
export const selectQueryLanguage = (state: QueryState): QueryLanguage => state.queryLanguage
export const selectIsExecuting = (state: QueryState): boolean => state.isExecuting
export const selectCurrentResult = (state: QueryState): QueryResult | null => state.currentResult
export const selectError = (state: QueryState): string | null => state.error
export const selectResultsViewMode = (state: QueryState): ResultsViewMode => state.resultsViewMode
export const selectRecentFields = (state: QueryState): Map<string, string[]> => state.recentFields
