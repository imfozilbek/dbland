import { invoke } from "@tauri-apps/api/core"
import { open, save } from "@tauri-apps/plugin-dialog"
import type {
    CollectionInfo,
    Connection,
    ConnectionConfig,
    DatabaseInfo,
    ExportOptions,
    ExportResult,
    ImportOptions,
    ImportResult,
    NewSavedQuery,
    PlatformAPI,
    QueryHistoryEntry,
    QueryResult,
    SavedQuery,
    TestConnectionResult,
    UpdateSavedQuery,
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

    getSavedQueries: async (connectionId: string): Promise<SavedQuery[]> => {
        const queries = await invoke<
            {
                id: number
                connection_id: string
                name: string
                description?: string
                query: string
                language: string
                database_name?: string
                collection_name?: string
                tags?: string
                created_at: string
                updated_at: string
            }[]
        >("get_saved_queries", { connectionId })

        return queries.map((q) => ({
            id: q.id,
            connectionId: q.connection_id,
            name: q.name,
            description: q.description,
            query: q.query,
            language: q.language,
            databaseName: q.database_name,
            collectionName: q.collection_name,
            tags: q.tags,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
        }))
    },

    saveQuery: async (query: NewSavedQuery): Promise<SavedQuery> => {
        const saved = await invoke<{
            id: number
            connection_id: string
            name: string
            description?: string
            query: string
            language: string
            database_name?: string
            collection_name?: string
            tags?: string
            created_at: string
            updated_at: string
        }>("save_query", {
            query: {
                connection_id: query.connectionId,
                name: query.name,
                description: query.description,
                query: query.query,
                language: query.language,
                database_name: query.databaseName,
                collection_name: query.collectionName,
                tags: query.tags,
            },
        })

        return {
            id: saved.id,
            connectionId: saved.connection_id,
            name: saved.name,
            description: saved.description,
            query: saved.query,
            language: saved.language,
            databaseName: saved.database_name,
            collectionName: saved.collection_name,
            tags: saved.tags,
            createdAt: saved.created_at,
            updatedAt: saved.updated_at,
        }
    },

    updateSavedQuery: async (query: UpdateSavedQuery): Promise<void> => {
        await invoke("update_saved_query", {
            query: {
                id: query.id,
                name: query.name,
                description: query.description,
                query: query.query,
                database_name: query.databaseName,
                collection_name: query.collectionName,
                tags: query.tags,
            },
        })
    },

    deleteSavedQuery: async (id: number): Promise<void> => {
        await invoke("delete_saved_query", { id })
    },

    searchSavedQueries: async (
        connectionId: string,
        searchQuery: string,
    ): Promise<SavedQuery[]> => {
        const queries = await invoke<
            {
                id: number
                connection_id: string
                name: string
                description?: string
                query: string
                language: string
                database_name?: string
                collection_name?: string
                tags?: string
                created_at: string
                updated_at: string
            }[]
        >("search_saved_queries", { connectionId, searchQuery })

        return queries.map((q) => ({
            id: q.id,
            connectionId: q.connection_id,
            name: q.name,
            description: q.description,
            query: q.query,
            language: q.language,
            databaseName: q.database_name,
            collectionName: q.collection_name,
            tags: q.tags,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
        }))
    },

    getSavedQueriesByTag: async (connectionId: string, tag: string): Promise<SavedQuery[]> => {
        const queries = await invoke<
            {
                id: number
                connection_id: string
                name: string
                description?: string
                query: string
                language: string
                database_name?: string
                collection_name?: string
                tags?: string
                created_at: string
                updated_at: string
            }[]
        >("get_saved_queries_by_tag", { connectionId, tag })

        return queries.map((q) => ({
            id: q.id,
            connectionId: q.connection_id,
            name: q.name,
            description: q.description,
            query: q.query,
            language: q.language,
            databaseName: q.database_name,
            collectionName: q.collection_name,
            tags: q.tags,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
        }))
    },

    getDocument: async (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
    ): Promise<ResultDocument> => {
        return invoke<ResultDocument>("get_document", {
            connectionId,
            databaseName,
            collectionName,
            documentId,
        })
    },

    updateDocument: async (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
        update: Record<string, unknown>,
    ): Promise<boolean> => {
        return invoke<boolean>("update_document", {
            connectionId,
            databaseName,
            collectionName,
            documentId,
            update,
        })
    },

    deleteDocument: async (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
    ): Promise<boolean> => {
        return invoke<boolean>("delete_document", {
            connectionId,
            databaseName,
            collectionName,
            documentId,
        })
    },

    cloneDocument: async (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
    ): Promise<string> => {
        return invoke<string>("clone_document", {
            connectionId,
            databaseName,
            collectionName,
            documentId,
        })
    },

    importData: async (connectionId: string, options: ImportOptions): Promise<ImportResult> => {
        const result = await invoke<{
            success: boolean
            imported: number
            failed: number
            errors: string[]
        }>("import_data", {
            connectionId,
            options: {
                file_path: options.filePath,
                format: options.format,
                database_name: options.databaseName,
                collection_name: options.collectionName,
            },
        })

        return {
            success: result.success,
            imported: result.imported,
            failed: result.failed,
            errors: result.errors,
        }
    },

    exportData: async (connectionId: string, options: ExportOptions): Promise<ExportResult> => {
        const result = await invoke<{
            success: boolean
            exported: number
            error?: string
        }>("export_data", {
            connectionId,
            options: {
                file_path: options.filePath,
                format: options.format,
                database_name: options.databaseName,
                collection_name: options.collectionName,
                query: options.query,
            },
        })

        return {
            success: result.success,
            exported: result.exported,
            error: result.error,
        }
    },

    openFileDialog: async (filters?: string[]): Promise<string | null> => {
        const selected = await open({
            multiple: false,
            filters: filters
                ? [
                      {
                          name: "Data files",
                          extensions: filters,
                      },
                  ]
                : undefined,
        })

        return selected as string | null
    },

    saveFileDialog: async (defaultName?: string, filters?: string[]): Promise<string | null> => {
        const selected = await save({
            defaultPath: defaultName,
            filters: filters
                ? [
                      {
                          name: "Data files",
                          extensions: filters,
                      },
                  ]
                : undefined,
        })

        return selected as string | null
    },
}
