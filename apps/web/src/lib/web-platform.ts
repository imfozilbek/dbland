import type { PlatformAPI } from "@dbland/ui"

/**
 * Web platform API stub.
 * TODO: Implement WebSocket proxy for web version.
 */
export const webPlatformAPI: PlatformAPI = {
    getConnections: async () => {
        // TODO: Implement WebSocket proxy
        return []
    },

    saveConnection: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },

    deleteConnection: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },

    testConnection: async () => {
        return {
            success: false,
            message: "Web version not yet implemented. Use desktop app.",
        }
    },

    connect: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },

    disconnect: async () => {
        throw new Error("Web version not yet implemented. Use desktop app.")
    },

    getDatabases: async () => {
        return []
    },

    getCollections: async () => {
        return []
    },
}
