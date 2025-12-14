import * as React from "react"
import { createContext, useContext } from "react"

/* -----------------------------------------------------------------------------
 * Types - shared between platforms
 * -------------------------------------------------------------------------- */

export type DatabaseType = "mongodb" | "redis"
export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

export interface ConnectionConfig {
    id?: string
    name: string
    type: DatabaseType
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
    type: DatabaseType
    host: string
    port: number
    username?: string
    database?: string
    authDatabase?: string
    tls: boolean
    status: ConnectionStatus
    lastConnectedAt?: string
}

export interface TestConnectionResult {
    success: boolean
    message: string
    latencyMs?: number
    serverVersion?: string
}

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

/* -----------------------------------------------------------------------------
 * Platform API Interface
 * -------------------------------------------------------------------------- */

export interface PlatformAPI {
    // Connection management
    getConnections: () => Promise<Connection[]>
    saveConnection: (config: ConnectionConfig) => Promise<Connection>
    deleteConnection: (connectionId: string) => Promise<void>
    testConnection: (config: ConnectionConfig) => Promise<TestConnectionResult>
    connect: (connectionId: string) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>

    // Schema
    getDatabases: (connectionId: string) => Promise<DatabaseInfo[]>
    getCollections: (connectionId: string, databaseName: string) => Promise<CollectionInfo[]>

    // Query (future)
    // executeQuery: (connectionId: string, query: string) => Promise<QueryResult>
}

/* -----------------------------------------------------------------------------
 * Context
 * -------------------------------------------------------------------------- */

const PlatformContext = createContext<PlatformAPI | null>(null)

export interface PlatformProviderProps {
    api: PlatformAPI
    children: React.ReactNode
}

export function PlatformProvider({ api, children }: PlatformProviderProps): JSX.Element {
    return <PlatformContext.Provider value={api}>{children}</PlatformContext.Provider>
}

export function usePlatform(): PlatformAPI {
    const context = useContext(PlatformContext)
    if (!context) {
        throw new Error("usePlatform must be used within a PlatformProvider")
    }
    return context
}

/* -----------------------------------------------------------------------------
 * Stub API for development/testing
 * -------------------------------------------------------------------------- */

export const stubPlatformAPI: PlatformAPI = {
    getConnections: async () => [],
    saveConnection: async () => {
        throw new Error("Not implemented")
    },
    deleteConnection: async () => {
        throw new Error("Not implemented")
    },
    testConnection: async () => ({ success: false, message: "Not implemented" }),
    connect: async () => {
        throw new Error("Not implemented")
    },
    disconnect: async () => {
        throw new Error("Not implemented")
    },
    getDatabases: async () => [],
    getCollections: async () => [],
}
