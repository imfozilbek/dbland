import { invoke } from "@tauri-apps/api/core"
import type {
    CollectionInfo,
    Connection,
    ConnectionConfig,
    DatabaseInfo,
    PlatformAPI,
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
}
