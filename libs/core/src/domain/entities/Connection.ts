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

/**
 * Whether the connection can be safely deleted right now.
 *
 * A `Connected` or `Connecting` connection has live server-side
 * resources (driver pool, optional SSH tunnel, optional auth session).
 * Deleting under those states is asking for resource leaks and
 * surprised users. Use cases / UI should call `disconnect` first or
 * surface a confirmation that the connection will be torn down before
 * the record is removed.
 *
 * `Disconnected` and `Error` states are terminal as far as session
 * resources go — safe to delete.
 */
export function canBeDeleted(connection: Connection): boolean {
    return (
        connection.status === ConnectionStatus.Disconnected ||
        connection.status === ConnectionStatus.Error
    )
}

/**
 * Whether the connection's *configuration* (host, port, auth, SSH
 * tunnel, SSL) can be edited right now. Editing while `Connecting`
 * is racy — the in-flight handshake holds a snapshot of the previous
 * config — and editing while `Connected` lies to the user about which
 * config the live driver is actually using. Force a disconnect first.
 */
export function canBeEdited(connection: Connection): boolean {
    return (
        connection.status === ConnectionStatus.Disconnected ||
        connection.status === ConnectionStatus.Error
    )
}

/**
 * State-machine map: which "next" statuses are valid from each
 * "previous" status. Encoded as a `Record<from, Set<to>>` so the
 * validator stays a single lookup instead of a sprawling switch.
 *
 * The valid transitions:
 *   Disconnected → Connecting | (idempotent Disconnected)
 *   Connecting   → Connected | Error | Disconnected (user cancelled)
 *   Connected    → Disconnected | Error
 *   Error        → Connecting (retry) | Disconnected
 *
 * Anything else is a programming error — for example, jumping straight
 * from `Disconnected` to `Connected` skips the `Connecting` event the
 * UI relies on for its loading spinner.
 */
const ALLOWED_TRANSITIONS: Record<ConnectionStatus, ReadonlySet<ConnectionStatus>> = {
    [ConnectionStatus.Disconnected]: new Set([
        ConnectionStatus.Connecting,
        ConnectionStatus.Disconnected,
    ]),
    [ConnectionStatus.Connecting]: new Set([
        ConnectionStatus.Connected,
        ConnectionStatus.Error,
        ConnectionStatus.Disconnected,
    ]),
    [ConnectionStatus.Connected]: new Set([ConnectionStatus.Disconnected, ConnectionStatus.Error]),
    [ConnectionStatus.Error]: new Set([ConnectionStatus.Connecting, ConnectionStatus.Disconnected]),
}

/**
 * Whether `next` is a legal transition from `current`. The
 * \`mark*\` helpers don't enforce this themselves (so existing call
 * sites stay backwards-compatible), but use cases / stores can call
 * this gate before applying a transition that originated from user
 * input or a Tauri-side event whose source they don't fully trust.
 */
export function canTransitionTo(current: ConnectionStatus, next: ConnectionStatus): boolean {
    return ALLOWED_TRANSITIONS[current].has(next)
}
