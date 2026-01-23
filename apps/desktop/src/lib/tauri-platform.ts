import { invoke } from "@tauri-apps/api/core"
import type {
    CollectionInfo,
    Connection,
    ConnectionConfig,
    DatabaseInfo,
    PlatformAPI,
    QueryHistoryEntry,
    QueryResult,
    TestConnectionResult,
} from "@dbland/ui"

/**
 * Tauri platform API implementation.
 * Uses Tauri's invoke() to call Rust backend commands.
 */
export const tauriPlatformAPI: PlatformAPI = {
    getConnections: async (): Promise<Connection[]> => {
        return invoke<Connection[]>("get_connections")
    },

    saveConnection: async (config: ConnectionConfig): Promise<Connection> => {
        return invoke<Connection>("save_connection", { config })
    },

    deleteConnection: async (connectionId: string): Promise<void> => {
        await invoke("delete_connection", { connectionId })
    },

    testConnection: async (config: ConnectionConfig): Promise<TestConnectionResult> => {
        return invoke<TestConnectionResult>("test_connection", { config })
    },

    connect: async (connectionId: string): Promise<void> => {
        await invoke("connect", { connectionId })
    },

    disconnect: async (connectionId: string): Promise<void> => {
        await invoke("disconnect", { connectionId })
    },

    getDatabases: async (connectionId: string): Promise<DatabaseInfo[]> => {
        return invoke<DatabaseInfo[]>("get_databases", { connectionId })
    },

    getCollections: async (
        connectionId: string,
        databaseName: string,
    ): Promise<CollectionInfo[]> => {
        return invoke<CollectionInfo[]>("get_collections", { connectionId, databaseName })
    },

    executeQuery: async (
        connectionId: string,
        query: string,
        databaseName?: string,
        collectionName?: string,
    ): Promise<QueryResult> => {
        // Backend requires database_name, default to "test" if not provided
        const result = await invoke<{
            success: boolean
            documents: Record<string, unknown>[]
            executionTimeMs: number
            documentsAffected: number
            error?: string
        }>("execute_query", {
            connectionId,
            databaseName: databaseName ?? "test",
            collectionName: collectionName ?? null,
            query,
        })

        // Map backend DTO to frontend QueryResult
        return {
            success: result.success,
            documents: result.documents,
            stats: {
                executionTimeMs: result.executionTimeMs,
                documentsReturned: result.documents.length,
                documentsExamined: result.documentsAffected,
            },
            error: result.error,
        }
    },

    getQueryHistory: async (connectionId: string, limit?: number): Promise<QueryHistoryEntry[]> => {
        const entries = await invoke<
            {
                id: number
                connection_id: string
                query: string
                language: string
                database_name?: string
                collection_name?: string
                executed_at: string
                execution_time_ms: number
                success: boolean
                result_count: number
                error?: string
            }[]
        >("get_query_history", { connectionId, limit: limit ?? 100 })

        // Map snake_case to camelCase
        return entries.map((entry) => ({
            id: entry.id,
            connectionId: entry.connection_id,
            query: entry.query,
            language: entry.language,
            databaseName: entry.database_name,
            collectionName: entry.collection_name,
            executedAt: entry.executed_at,
            executionTimeMs: entry.execution_time_ms,
            success: entry.success,
            resultCount: entry.result_count,
            error: entry.error,
        }))
    },

    deleteQueryHistory: async (id: number): Promise<void> => {
        await invoke("delete_query_history", { id })
    },

    clearQueryHistory: async (connectionId: string): Promise<void> => {
        await invoke("clear_query_history", { connectionId })
    },

    searchQueryHistory: async (
        connectionId: string,
        searchQuery: string,
        limit?: number,
    ): Promise<QueryHistoryEntry[]> => {
        const entries = await invoke<
            {
                id: number
                connection_id: string
                query: string
                language: string
                database_name?: string
                collection_name?: string
                executed_at: string
                execution_time_ms: number
                success: boolean
                result_count: number
                error?: string
            }[]
        >("search_query_history", { connectionId, searchQuery, limit: limit ?? 100 })

        // Map snake_case to camelCase
        return entries.map((entry) => ({
            id: entry.id,
            connectionId: entry.connection_id,
            query: entry.query,
            language: entry.language,
            databaseName: entry.database_name,
            collectionName: entry.collection_name,
            executedAt: entry.executed_at,
            executionTimeMs: entry.execution_time_ms,
            success: entry.success,
            resultCount: entry.result_count,
            error: entry.error,
        }))
    },
}
