import { ConnectionConfig } from "../value-objects/ConnectionConfig"
import { DatabaseType } from "../value-objects/DatabaseType"

/**
 * Connection status
 */
export enum ConnectionStatus {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Error = "error",
}

/**
 * Connection entity - represents a saved database connection
 */
export interface Connection {
    id: string
    name: string
    type: DatabaseType
    config: ConnectionConfig
    status: ConnectionStatus
    color?: string
    groupId?: string
    lastConnectedAt?: Date
    createdAt: Date
    updatedAt: Date
}

/**
 * Create a new connection
 */
export function createConnection(config: ConnectionConfig, id?: string): Connection {
    const now = new Date()
    return {
        id: id ?? crypto.randomUUID(),
        name: config.name,
        type: config.type,
        config,
        status: ConnectionStatus.Disconnected,
        createdAt: now,
        updatedAt: now,
    }
}

/**
 * Update connection status
 */
export function updateConnectionStatus(
    connection: Connection,
    status: ConnectionStatus,
): Connection {
    return {
        ...connection,
        status,
        updatedAt: new Date(),
        ...(status === ConnectionStatus.Connected ? { lastConnectedAt: new Date() } : {}),
    }
}
