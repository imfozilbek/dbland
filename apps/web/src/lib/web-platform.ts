import type { PlatformAPI } from "@dbland/ui"

/**
 * Web platform API stub.
 * The web build does not yet have a transport — every method rejects with a clear
 * message until the WebSocket proxy lands. We still implement the full interface
 * shape so the typechecker can guard the contract between UI and platform.
 *
 * TODO(v1.3.0): replace with real WebSocket-backed implementation.
 */
const NOT_IMPLEMENTED = "Web version not yet implemented. Use desktop app."
const notImplemented = (): Promise<never> => Promise.reject(new Error(NOT_IMPLEMENTED))

export const webPlatformAPI: PlatformAPI = {
    // Connection management
    getConnections: () => Promise.resolve([]),
    saveConnection: notImplemented,
    deleteConnection: notImplemented,
    testConnection: () =>
        Promise.resolve({
            success: false,
            message: NOT_IMPLEMENTED,
        }),
    connect: notImplemented,
    disconnect: notImplemented,

    // Schema
    getDatabases: () => Promise.resolve([]),
    getCollections: () => Promise.resolve([]),

    // Query execution
    executeQuery: notImplemented,

    // Query History
    getQueryHistory: () => Promise.resolve([]),
    deleteQueryHistory: notImplemented,
    clearQueryHistory: notImplemented,
    searchQueryHistory: () => Promise.resolve([]),

    // Saved Queries
    getSavedQueries: () => Promise.resolve([]),
    saveQuery: notImplemented,
    updateSavedQuery: notImplemented,
    deleteSavedQuery: notImplemented,
    searchSavedQueries: () => Promise.resolve([]),
    getSavedQueriesByTag: () => Promise.resolve([]),

    // Document Operations
    getDocument: notImplemented,
    updateDocument: notImplemented,
    deleteDocument: notImplemented,
    cloneDocument: notImplemented,

    // Import/Export
    importData: notImplemented,
    exportData: notImplemented,
    openFileDialog: () => Promise.resolve(null),
    saveFileDialog: () => Promise.resolve(null),

    // Aggregation
    executeAggregationPipeline: notImplemented,
    previewPipelineStage: notImplemented,

    // Indexes
    getIndexes: () => Promise.resolve([]),
    createIndex: notImplemented,
    dropIndex: notImplemented,
    getIndexStats: () => Promise.resolve([]),

    // Redis
    redisScanKeys: () => Promise.resolve({ keys: [], cursor: 0 }),
    redisGetValue: () => Promise.resolve({ value: { type: "none" }, ttl: null }),
    redisSetTTL: () => Promise.resolve(false),
    redisSlowLog: () => Promise.resolve([]),

    // Database Profiler
    getProfilerLevel: () => Promise.resolve({ level: 0 }),
    setProfilerLevel: notImplemented,
    getProfilerData: () => Promise.resolve([]),
    clearProfilerData: notImplemented,

    // Collection Statistics
    getDetailedCollectionStats: notImplemented,

    // Geospatial
    executeGeospatialQuery: notImplemented,

    // GridFS
    listGridFSFiles: () => Promise.resolve([]),
    getGridFSFileMetadata: notImplemented,
    deleteGridFSFile: notImplemented,
    downloadGridFSFile: notImplemented,

    // Replica Set
    getReplicaSetStatus: notImplemented,
    getReplicaSetConfig: notImplemented,

    // Sharding
    getShardingStatus: notImplemented,
    listShards: () => Promise.resolve([]),
    listShardedCollections: () => Promise.resolve([]),
    getChunkDistribution: () => Promise.resolve([]),
}
