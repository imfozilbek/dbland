import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"

export interface DatabaseInfo {
    name: string
    sizeBytes?: number
    collectionCount?: number
}

export interface CollectionInfo {
    name: string
    databaseName: string
    documentCount?: number
    sizeBytes?: number
}

interface SchemaState {
    // State
    databases: Map<string, DatabaseInfo[]> // connectionId -> databases
    collections: Map<string, CollectionInfo[]> // `${connectionId}:${dbName}` -> collections
    isLoading: boolean
    error: string | null

    // Actions
    loadDatabases: (connectionId: string) => Promise<DatabaseInfo[]>
    loadCollections: (connectionId: string, databaseName: string) => Promise<CollectionInfo[]>
    clearSchema: (connectionId: string) => void
    clearAll: () => void
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
    // Initial state
    databases: new Map(),
    collections: new Map(),
    isLoading: false,
    error: null,

    // Load databases for a connection
    loadDatabases: async (connectionId: string): Promise<DatabaseInfo[]> => {
        set({ isLoading: true, error: null })
        try {
            const databases = await invoke<DatabaseInfo[]>("get_databases", { connectionId })

            const { databases: currentDbs } = get()
            const updated = new Map(currentDbs)
            updated.set(connectionId, databases)

            set({ databases: updated, isLoading: false })
            return databases
        } catch (error) {
            set({ error: String(error), isLoading: false })
            throw error
        }
    },

    // Load collections for a database
    loadCollections: async (
        connectionId: string,
        databaseName: string,
    ): Promise<CollectionInfo[]> => {
        set({ isLoading: true, error: null })
        try {
            const collections = await invoke<CollectionInfo[]>("get_collections", {
                connectionId,
                databaseName,
            })

            const key = `${connectionId}:${databaseName}`
            const { collections: currentColls } = get()
            const updated = new Map(currentColls)
            updated.set(key, collections)

            set({ collections: updated, isLoading: false })
            return collections
        } catch (error) {
            set({ error: String(error), isLoading: false })
            throw error
        }
    },

    // Clear schema for a specific connection
    clearSchema: (connectionId: string): void => {
        const { databases, collections } = get()

        const updatedDbs = new Map(databases)
        updatedDbs.delete(connectionId)

        const updatedColls = new Map(collections)
        for (const key of updatedColls.keys()) {
            if (key.startsWith(`${connectionId}:`)) {
                updatedColls.delete(key)
            }
        }

        set({ databases: updatedDbs, collections: updatedColls })
    },

    // Clear all schema data
    clearAll: (): void => {
        set({ databases: new Map(), collections: new Map() })
    },
}))

// Selectors
export const selectDatabases =
    (connectionId: string) =>
    (state: SchemaState): DatabaseInfo[] =>
        state.databases.get(connectionId) ?? []

export const selectCollections =
    (connectionId: string, databaseName: string) =>
    (state: SchemaState): CollectionInfo[] =>
        state.collections.get(`${connectionId}:${databaseName}`) ?? []
