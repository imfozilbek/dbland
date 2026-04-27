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
 * Update connection status.
 *
 * Prefer the named transitions below (`markConnecting`, `markConnected`,
 * `markFailed`, `markDisconnected`) — they encode the intent at the call site
 * and let consumers express domain behaviour instead of plain status writes.
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

/**
 * Transition into "connecting" — request initiated, awaiting server reply.
 */
export function markConnecting(connection: Connection): Connection {
    return updateConnectionStatus(connection, ConnectionStatus.Connecting)
}

/**
 * Transition into "connected" — server accepted the handshake.
 * `lastConnectedAt` is bumped to now.
 */
export function markConnected(connection: Connection): Connection {
    return updateConnectionStatus(connection, ConnectionStatus.Connected)
}

/**
 * Transition into "error" — connect/handshake failed. Caller should surface
 * the underlying error separately; the entity only carries the status flag.
 */
export function markFailed(connection: Connection): Connection {
    return updateConnectionStatus(connection, ConnectionStatus.Error)
}

/**
 * Transition into "disconnected" — clean teardown initiated by the user
 * or by a session-expiry event.
 */
export function markDisconnected(connection: Connection): Connection {
    return updateConnectionStatus(connection, ConnectionStatus.Disconnected)
}

/**
 * Whether the connection is in a state that can serve queries.
 */
export function canExecuteQuery(connection: Connection): boolean {
    return connection.status === ConnectionStatus.Connected
}
