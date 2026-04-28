import { Connection, ConnectionStatus } from "../../domain/entities/Connection"
import { DecryptedCredentials } from "../../domain/value-objects/Credentials"

/**
 * Atomic status-and-metadata transition the storage layer should write
 * in a single round trip. The use case used to call `updateConnection`
 * twice in a row — once on entering "connecting", once on success or
 * failure — which left a window where a process crash between the two
 * persists state that disagrees with the in-memory aggregate. Bundling
 * both writes into one method lets the implementation choose a real
 * transaction (SQLite `BEGIN/COMMIT`, single update SQL, single IPC
 * call to the Rust side) and lets the use case stop reasoning about
 * intermediate states.
 */
export interface ConnectionTransition {
    status: ConnectionStatus
    /** Set on a successful connect; left undefined on failure transitions. */
    lastConnectedAt?: Date
    /** Optional reason captured in the same write for failure transitions. */
    error?: string
}

/**
 * Connection group for organizing connections
 */
export interface ConnectionGroup {
    id: string
    name: string
    color?: string
    parentId?: string
    order?: number
}

/**
 * Connection storage port interface
 * Handles persistence of connections and credentials
 */
export interface ConnectionStoragePort {
    /**
     * Get all saved connections
     */
    getConnections(): Promise<Connection[]>

    /**
     * Get a connection by ID
     */
    getConnection(id: string): Promise<Connection | null>

    /**
     * Save a connection
     */
    saveConnection(connection: Connection): Promise<void>

    /**
     * Update a connection
     */
    updateConnection(id: string, updates: Partial<Connection>): Promise<void>

    /**
     * Persist a status transition atomically. Default implementation in
     * adapters that pre-date this method may delegate to
     * \`updateConnection\` (one write), but the contract is that callers
     * never observe a half-applied state — either both the status and
     * the accompanying timestamp / error are persisted, or neither is.
     */
    persistConnectionTransition(id: string, transition: ConnectionTransition): Promise<void>

    /**
     * Delete a connection
     */
    deleteConnection(id: string): Promise<void>

    /**
     * Get credentials for a connection
     */
    getCredentials(connectionId: string): Promise<DecryptedCredentials | null>

    /**
     * Save credentials for a connection
     */
    saveCredentials(connectionId: string, credentials: DecryptedCredentials): Promise<void>

    /**
     * Delete credentials for a connection
     */
    deleteCredentials(connectionId: string): Promise<void>

    /**
     * Get all connection groups
     */
    getGroups(): Promise<ConnectionGroup[]>

    /**
     * Save a connection group
     */
    saveGroup(group: ConnectionGroup): Promise<void>

    /**
     * Delete a connection group
     */
    deleteGroup(id: string): Promise<void>

    /**
     * Export connections to a file
     */
    exportConnections(connectionIds?: string[]): Promise<Blob>

    /**
     * Import connections from a file
     */
    importConnections(data: Blob): Promise<{ imported: number; skipped: number }>
}
