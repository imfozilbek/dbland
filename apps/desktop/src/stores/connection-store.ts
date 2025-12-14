import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"

// Types matching Rust DTOs
export interface ConnectionConfig {
    id?: string
    name: string
    type: "mongodb" | "redis"
    host: string
    port: number
    username?: string
    password?: string
    database?: string
    authDatabase?: string
    tls?: boolean
}

export interface Connection {
    id: string
    name: string
    type: "mongodb" | "redis"
    host: string
    port: number
    username?: string
    database?: string
    authDatabase?: string
    tls: boolean
    status: "connected" | "disconnected" | "connecting" | "error"
    lastConnectedAt?: string
}

export interface TestConnectionResult {
    success: boolean
    message: string
    latencyMs?: number
    serverVersion?: string
}

interface ConnectionState {
    // State
    connections: Connection[]
    activeConnectionId: string | null
    isLoading: boolean
    error: string | null

    // Actions
    loadConnections: () => Promise<void>
    saveConnection: (config: ConnectionConfig) => Promise<Connection>
    deleteConnection: (id: string) => Promise<void>
    testConnection: (config: ConnectionConfig) => Promise<TestConnectionResult>
    connect: (id: string) => Promise<void>
    disconnect: (id: string) => Promise<void>
    setActiveConnection: (id: string | null) => void
    clearError: () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
    // Initial state
    connections: [],
    activeConnectionId: null,
    isLoading: false,
    error: null,

    // Load all connections from storage
    loadConnections: async (): Promise<void> => {
        set({ isLoading: true, error: null })
        try {
            const connections = await invoke<Connection[]>("get_connections")
            set({ connections, isLoading: false })
        } catch (error) {
            set({ error: String(error), isLoading: false })
        }
    },

    // Save a new connection or update existing
    saveConnection: async (config: ConnectionConfig): Promise<Connection> => {
        set({ isLoading: true, error: null })
        try {
            const connection = await invoke<Connection>("save_connection", { config })
            const { connections } = get()

            // Update or add connection
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

    // Delete a connection
    deleteConnection: async (id: string): Promise<void> => {
        set({ isLoading: true, error: null })
        try {
            await invoke("delete_connection", { connectionId: id })
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

    // Test a connection without saving
    testConnection: async (config: ConnectionConfig): Promise<TestConnectionResult> => {
        try {
            return await invoke<TestConnectionResult>("test_connection", { config })
        } catch (error) {
            return {
                success: false,
                message: String(error),
            }
        }
    },

    // Connect to a database
    connect: async (id: string): Promise<void> => {
        const { connections } = get()
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
            await invoke("connect", { connectionId: id })

            // Update status to connected
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
            // Update status to error
            set({
                connections: get().connections.map((c) =>
                    c.id === id ? { ...c, status: "error" as const } : c,
                ),
                error: String(error),
            })
            throw error
        }
    },

    // Disconnect from a database
    disconnect: async (id: string): Promise<void> => {
        try {
            await invoke("disconnect", { connectionId: id })

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

    // Set active connection (for UI)
    setActiveConnection: (id: string | null): void => {
        set({ activeConnectionId: id })
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
