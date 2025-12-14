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
 * Create connection established event
 */
export function createConnectionEstablishedEvent(
    connection: Connection,
): ConnectionEstablishedEvent {
    return {
        type: "connection.established",
        payload: { connection },
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
