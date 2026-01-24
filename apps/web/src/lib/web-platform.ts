import type { PlatformAPI } from "@dbland/ui"

/**
 * Web platform API stub.
 * TODO: Implement WebSocket proxy for web version.
 */
export const webPlatformAPI: PlatformAPI = {
    getConnections: async () => [],
    saveConnection: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    deleteConnection: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    testConnection: async () => ({
        success: false,
        message: "Web version not yet implemented. Use desktop app.",
    }),
    connect: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    disconnect: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    getDatabases: async () => [],
    getCollections: async () => [],
    executeQuery: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    getQueryHistory: async () => [],
    deleteQueryHistory: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    clearQueryHistory: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    searchQueryHistory: async () => [],
    getSavedQueries: async () => [],
    saveQuery: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    updateSavedQuery: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    deleteSavedQuery: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    searchSavedQueries: async () => [],
    getSavedQueriesByTag: async () => [],
    getDocument: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    updateDocument: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    deleteDocument: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    cloneDocument: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    importData: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    exportData: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    openFileDialog: async () => null,
    saveFileDialog: async () => null,
    executeAggregationPipeline: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    previewPipelineStage: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    getIndexes: async () => [],
    createIndex: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    dropIndex: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },
    getIndexStats: async () => [],
    redisScanKeys: async () => ({ keys: [], cursor: 0 }),
    redisGetValue: async () => ({ value: { type: "none" }, ttl: null }),
    redisSetTTL: async () => false,
    redisSlowLog: async () => [],
}
