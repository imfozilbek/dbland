import { create } from "zustand"
import type { CollectionInfo, DatabaseInfo, PlatformAPI } from "../contexts/PlatformContext"
import { extractErrorMessage } from "@dbland/core"

export type { DatabaseInfo, CollectionInfo }

/**
 * Cache key for an in-flight schema fetch. Databases live under
 * `db:<connectionId>`; collections under `coll:<connectionId>:<dbName>`.
 * Centralised here so the loader and the selectors can't drift
 * apart on key shape.
 */
const dbsKey = (connectionId: string): string => `db:${connectionId}`
const collsKey = (connectionId: string, databaseName: string): string =>
    `coll:${connectionId}:${databaseName}`

interface SchemaState {
    // State
    databases: Map<string, DatabaseInfo[]> // connectionId -> databases
    collections: Map<string, CollectionInfo[]> // `${connectionId}:${dbName}` -> collections
    /**
     * Set of in-flight loader keys. Replaced the previous single
     * `isLoading: boolean` flag — with one global flag, a fast
     * `loadCollections` finishing flipped the spinner off while a
     * slow `loadDatabases` was still in flight, and the UI claimed
     * "loaded" while the tree was actually empty. Per-key tracking
     * lets `isLoadingDatabases` / `isLoadingCollections` answer
     * accurately for any node.
     */
    loading: Set<string>
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

/**
 * Mark `key` as in-flight inside an immutable update. Returns the
 * next Set; never mutates the input. Pulled out so the two loaders
 * read the same way.
 */
function withLoading(prev: Set<string>, key: string): Set<string> {
    const next = new Set(prev)
    next.add(key)
    return next
}

function withoutLoading(prev: Set<string>, key: string): Set<string> {
    const next = new Set(prev)
    next.delete(key)
    return next
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
    // Initial state
    databases: new Map(),
    collections: new Map(),
    loading: new Set(),
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

        const key = dbsKey(connectionId)
        set((state) => ({ loading: withLoading(state.loading, key), error: null }))
        try {
            const databases = await _api.getDatabases(connectionId)

            set((state) => {
                const updated = new Map(state.databases)
                updated.set(connectionId, databases)
                return { databases: updated, loading: withoutLoading(state.loading, key) }
            })
            return databases
        } catch (error) {
            set((state) => ({
                error: extractErrorMessage(error),
                loading: withoutLoading(state.loading, key),
            }))
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

        const key = collsKey(connectionId, databaseName)
        set((state) => ({ loading: withLoading(state.loading, key), error: null }))
        try {
            const collections = await _api.getCollections(connectionId, databaseName)

            set((state) => {
                const updated = new Map(state.collections)
                updated.set(`${connectionId}:${databaseName}`, collections)
                return { collections: updated, loading: withoutLoading(state.loading, key) }
            })
            return collections
        } catch (error) {
            set((state) => ({
                error: extractErrorMessage(error),
                loading: withoutLoading(state.loading, key),
            }))
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

/** Whether the databases for a specific connection are being fetched. */
export const selectIsLoadingDatabases =
    (connectionId: string) =>
    (state: SchemaState): boolean =>
        state.loading.has(dbsKey(connectionId))

/** Whether the collections for a specific database are being fetched. */
export const selectIsLoadingCollections =
    (connectionId: string, databaseName: string) =>
    (state: SchemaState): boolean =>
        state.loading.has(collsKey(connectionId, databaseName))

/**
 * Whether *any* schema fetch is in flight. Backwards-compatible
 * stand-in for the previous `isLoading: boolean` field — components
 * that only need a global "anything loading?" indicator (toolbar
 * spinners, "Loading…" placeholders) can keep using a flag-shaped
 * selector without caring about the new key-tracking design.
 */
export const selectIsLoading = (state: SchemaState): boolean => state.loading.size > 0
