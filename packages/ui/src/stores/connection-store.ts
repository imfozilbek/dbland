import { create } from "zustand"
import type {
    Connection,
    ConnectionConfig,
    ConnectionStatus,
    PlatformAPI,
    TestConnectionResult,
} from "../contexts/PlatformContext"
import { extractErrorMessage } from "@dbland/core"

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

type Get = () => ConnectionState
type Set = (
    partial:
        | ConnectionState
        | Partial<ConnectionState>
        | ((state: ConnectionState) => ConnectionState | Partial<ConnectionState>),
) => void

/**
 * Each action lives in its own factory so the zustand `create(...)` call
 * doesn't end up as a 147-line arrow (the original tripped the
 * max-lines-per-function rule). Pure functions of (get, set) — easy
 * to test in isolation later.
 */

function createLoadConnections(get: Get, set: Set): () => Promise<void> {
    return async () => {
        const { _api } = get()
        if (!_api) {
            return
        }
        set({ isLoading: true, error: null })
        try {
            const connections = await _api.getConnections()
            set({ connections, isLoading: false })
        } catch (error) {
            set({ error: extractErrorMessage(error), isLoading: false })
        }
    }
}

function createSaveConnection(
    get: Get,
    set: Set,
): (config: ConnectionConfig) => Promise<Connection> {
    return async (config) => {
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
            set({ error: extractErrorMessage(error), isLoading: false })
            throw error
        }
    }
}

/**
 * Mirror of the domain rule from `Connection.canBeDeleted` (libs/core):
 * a connection in `connecting` or `connected` state has live driver
 * resources and an optional SSH tunnel; deleting it on the client
 * leaves the backend mid-handshake and orphans those resources. The
 * UI usually disables the delete button — but a stale focus or a
 * keyboard shortcut can still fire it, so the store enforces too.
 */
function canDeleteByStatus(status: ConnectionStatus): boolean {
    return status === "disconnected" || status === "error"
}

function createDeleteConnection(get: Get, set: Set): (id: string) => Promise<void> {
    return async (id) => {
        const { _api, connections } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }

        const target = connections.find((c) => c.id === id)
        if (target && !canDeleteByStatus(target.status)) {
            const message = "Disconnect the connection before deleting it"
            set({ error: message })
            throw new Error(message)
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
            set({ error: extractErrorMessage(error), isLoading: false })
            throw error
        }
    }
}

function createTestConnection(
    get: Get,
): (config: ConnectionConfig) => Promise<TestConnectionResult> {
    return async (config) => {
        const { _api } = get()
        if (!_api) {
            return { success: false, message: "Platform API not initialized" }
        }
        try {
            return await _api.testConnection(config)
        } catch (error) {
            return { success: false, message: extractErrorMessage(error) }
        }
    }
}

function createConnect(get: Get, set: Set): (id: string) => Promise<void> {
    return async (id) => {
        const { _api, connections } = get()
        if (!_api) {
            throw new Error("Platform API not initialized")
        }
        const connection = connections.find((c) => c.id === id)
        if (!connection) {
            throw new Error("Connection not found")
        }
        set({
            connections: connections.map((c) =>
                c.id === id ? { ...c, status: "connecting" as const } : c,
            ),
            error: null,
        })
        try {
            await _api.connect(id)
            const updated = get().connections.map((c) =>
                c.id === id
                    ? {
                          ...c,
                          status: "connected" as const,
                          lastConnectedAt: new Date().toISOString(),
                      }
                    : c,
            )
            set({ connections: updated, activeConnectionId: id })
        } catch (error) {
            set({
                connections: get().connections.map((c) =>
                    c.id === id ? { ...c, status: "error" as const } : c,
                ),
                error: extractErrorMessage(error),
            })
            throw error
        }
    }
}

function createDisconnect(get: Get, set: Set): (id: string) => Promise<void> {
    return async (id) => {
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
            set({ error: extractErrorMessage(error) })
            throw error
        }
    }
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
    connections: [],
    activeConnectionId: null,
    isLoading: false,
    error: null,
    _api: null,

    setApi: (api) => {
        set({ _api: api })
    },
    loadConnections: createLoadConnections(get, set),
    saveConnection: createSaveConnection(get, set),
    deleteConnection: createDeleteConnection(get, set),
    testConnection: createTestConnection(get),
    connect: createConnect(get, set),
    disconnect: createDisconnect(get, set),
    setActiveConnection: (id) => {
        set({ activeConnectionId: id })
    },
    updateConnectionStatus: (id, status) => {
        const { connections } = get()
        set({
            connections: connections.map((c) => (c.id === id ? { ...c, status } : c)),
        })
    },
    clearError: () => {
        set({ error: null })
    },
}))

// Selectors
export const selectConnections = (state: ConnectionState): Connection[] => state.connections

export const selectActiveConnection = (state: ConnectionState): Connection | undefined =>
    state.connections.find((c) => c.id === state.activeConnectionId)

export const selectConnectedConnections = (state: ConnectionState): Connection[] =>
    state.connections.filter((c) => c.status === "connected")
