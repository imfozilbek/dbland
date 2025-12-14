import { create } from "zustand"
import type { CollectionInfo, DatabaseInfo, PlatformAPI } from "../contexts/PlatformContext"

export type { DatabaseInfo, CollectionInfo }

interface SchemaState {
    // State
    databases: Map<string, DatabaseInfo[]> // connectionId -> databases
    collections: Map<string, CollectionInfo[]> // `${connectionId}:${dbName}` -> collections
    isLoading: boolean
    error: string | null

    // Internal
    _api: PlatformAPI | null

    // Actions
    setApi: (api: PlatformAPI) => void
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
    _api: null,

    // Set platform API
    setApi: (api: PlatformAPI): void => {
        set({ _api: api })
    },

    // Load databases for a connection
    loadDatabases: async (connectionId: string): Promise<DatabaseInfo[]> => {
        const { _api } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        set({ isLoading: true, error: null })
        try {
            const databases = await _api.getDatabases(connectionId)

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
        const { _api } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        set({ isLoading: true, error: null })
        try {
            const collections = await _api.getCollections(connectionId, databaseName)

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
