import { create } from "zustand"
import type {
    Connection,
    ConnectionConfig,
    ConnectionStatus,
    PlatformAPI,
    TestConnectionResult,
} from "../contexts/PlatformContext"

export type { Connection, ConnectionConfig, ConnectionStatus, TestConnectionResult }

interface ConnectionState {
    // State
    connections: Connection[]
    activeConnectionId: string | null
    isLoading: boolean
    error: string | null

    // Internal
    _api: PlatformAPI | null

    // Actions
    setApi: (api: PlatformAPI) => void
    loadConnections: () => Promise<void>
    saveConnection: (config: ConnectionConfig) => Promise<Connection>
    deleteConnection: (id: string) => Promise<void>
    testConnection: (config: ConnectionConfig) => Promise<TestConnectionResult>
    connect: (id: string) => Promise<void>
    disconnect: (id: string) => Promise<void>
    setActiveConnection: (id: string | null) => void
    updateConnectionStatus: (id: string, status: ConnectionStatus) => void
    clearError: () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
    // Initial state
    connections: [],
    activeConnectionId: null,
    isLoading: false,
    error: null,
    _api: null,

    // Set platform API
    setApi: (api: PlatformAPI): void => {
        set({ _api: api })
    },

    // Load all connections
    loadConnections: async (): Promise<void> => {
        const { _api } = get()
        if (!_api) {
            return
        }

        set({ isLoading: true, error: null })
        try {
            const connections = await _api.getConnections()
            set({ connections, isLoading: false })
        } catch (error) {
            set({ error: String(error), isLoading: false })
        }
    },

    // Save connection
    saveConnection: async (config: ConnectionConfig): Promise<Connection> => {
        const { _api } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        set({ isLoading: true, error: null })
        try {
            const connection = await _api.saveConnection(config)
            const { connections } = get()

            const existingIndex = connections.findIndex((c) => c.id === connection.id)
            if (existingIndex >= 0) {
                const updated = [...connections]
                updated[existingIndex] = connection
                set({ connections: updated, isLoading: false })
            } else {
                set({ connections: [...connections, connection], isLoading: false })
            }

            return connection
        } catch (error) {
            set({ error: String(error), isLoading: false })
            throw error
        }
    },

    // Delete connection
    deleteConnection: async (id: string): Promise<void> => {
        const { _api } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        set({ isLoading: true, error: null })
        try {
            await _api.deleteConnection(id)
            const { connections, activeConnectionId } = get()

            set({
                connections: connections.filter((c) => c.id !== id),
                activeConnectionId: activeConnectionId === id ? null : activeConnectionId,
                isLoading: false,
            })
        } catch (error) {
            set({ error: String(error), isLoading: false })
            throw error
        }
    },

    // Test connection
    testConnection: async (config: ConnectionConfig): Promise<TestConnectionResult> => {
        const { _api } = get()
        if (!_api) {
            return { success: false, message: "Platform API not initialized" }
        }

        try {
            return await _api.testConnection(config)
        } catch (error) {
            return { success: false, message: String(error) }
        }
    },

    // Connect
    connect: async (id: string): Promise<void> => {
        const { _api, connections } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        const connection = connections.find((c) => c.id === id)
        if (!connection) {
            throw new Error("Connection not found")
        }

        // Update status to connecting
        set({
            connections: connections.map((c) =>
                c.id === id ? { ...c, status: "connecting" as const } : c,
            ),
            error: null,
        })

        try {
            await _api.connect(id)

            const updatedConnections = get().connections.map((c) =>
                c.id === id
                    ? {
                          ...c,
                          status: "connected" as const,
                          lastConnectedAt: new Date().toISOString(),
                      }
                    : c,
            )

            set({
                connections: updatedConnections,
                activeConnectionId: id,
            })
        } catch (error) {
            set({
                connections: get().connections.map((c) =>
                    c.id === id ? { ...c, status: "error" as const } : c,
                ),
                error: String(error),
            })
            throw error
        }
    },

    // Disconnect
    disconnect: async (id: string): Promise<void> => {
        const { _api } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        try {
            await _api.disconnect(id)

            const { connections, activeConnectionId } = get()

            set({
                connections: connections.map((c) =>
                    c.id === id ? { ...c, status: "disconnected" as const } : c,
                ),
                activeConnectionId: activeConnectionId === id ? null : activeConnectionId,
            })
        } catch (error) {
            set({ error: String(error) })
            throw error
        }
    },

    // Set active connection
    setActiveConnection: (id: string | null): void => {
        set({ activeConnectionId: id })
    },

    // Update connection status
    updateConnectionStatus: (id: string, status: ConnectionStatus): void => {
        const { connections } = get()
        set({
            connections: connections.map((c) => (c.id === id ? { ...c, status } : c)),
        })
    },

    // Clear error
    clearError: (): void => {
        set({ error: null })
    },
}))

// Selectors
export const selectConnections = (state: ConnectionState): Connection[] => state.connections

export const selectActiveConnection = (state: ConnectionState): Connection | undefined =>
    state.connections.find((c) => c.id === state.activeConnectionId)

export const selectConnectedConnections = (state: ConnectionState): Connection[] =>
    state.connections.filter((c) => c.status === "connected")
