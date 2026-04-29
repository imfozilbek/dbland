import { Connection, ConnectionStatus } from "../entities/Connection"

/**
 * Base event interface
 */
export interface DomainEvent<T = unknown> {
    type: string
    payload: T
    timestamp: Date
}

/**
 * Connection established event
 */
export interface ConnectionEstablishedEvent extends DomainEvent<{
    connection: Connection
}> {
    type: "connection.established"
}

/**
 * Connection disconnected event
 */
export interface ConnectionDisconnectedEvent extends DomainEvent<{
    connectionId: string
    reason?: string
}> {
    type: "connection.disconnected"
}

/**
 * Connection failed event
 */
export interface ConnectionFailedEvent extends DomainEvent<{
    connectionId: string
    error: string
}> {
    type: "connection.failed"
}

/**
 * Connection status changed event
 */
export interface ConnectionStatusChangedEvent extends DomainEvent<{
    connectionId: string
    previousStatus: ConnectionStatus
    newStatus: ConnectionStatus
}> {
    type: "connection.status_changed"
}

/**
 * Strip every secret-bearing field from a `Connection` before it
 * lands on a domain-event payload. Events are routinely structured-
 * logged, sent through observability sinks, and persisted — without
 * this scrub, a `connection.established` log line would carry the
 * database password, the SSH password, the SSH key passphrase, *and*
 * the inline private-key contents in the clear. The runtime adapters
 * read credentials from the storage port directly; nobody ever needs
 * them off the event bus.
 */
function redactConnectionForEvent(connection: Connection): Connection {
    const auth = connection.config.auth
    const ssh = connection.config.ssh
    return {
        ...connection,
        config: {
            ...connection.config,
            auth: auth ? { ...auth, password: undefined } : auth,
            ssh: ssh
                ? {
                      ...ssh,
                      password: undefined,
                      passphrase: undefined,
                      privateKeyPath: ssh.privateKeyPath ? "[REDACTED]" : undefined,
                  }
                : ssh,
            connectionString: connection.config.connectionString ? "[REDACTED]" : undefined,
        },
    }
}

/**
 * Create connection established event
 */
export function createConnectionEstablishedEvent(
    connection: Connection,
): ConnectionEstablishedEvent {
    return {
        type: "connection.established",
        payload: { connection: redactConnectionForEvent(connection) },
        timestamp: new Date(),
    }
}

/**
 * Create connection disconnected event
 */
export function createConnectionDisconnectedEvent(
    connectionId: string,
    reason?: string,
): ConnectionDisconnectedEvent {
    return {
        type: "connection.disconnected",
        payload: { connectionId, reason },
        timestamp: new Date(),
    }
}

/**
 * Create connection failed event
 */
export function createConnectionFailedEvent(
    connectionId: string,
    error: string,
): ConnectionFailedEvent {
    return {
        type: "connection.failed",
        payload: { connectionId, error },
        timestamp: new Date(),
    }
}

/**
 * Create connection status changed event
 */
export function createConnectionStatusChangedEvent(
    connectionId: string,
    previousStatus: ConnectionStatus,
    newStatus: ConnectionStatus,
): ConnectionStatusChangedEvent {
    return {
        type: "connection.status_changed",
        payload: { connectionId, previousStatus, newStatus },
        timestamp: new Date(),
    }
}
