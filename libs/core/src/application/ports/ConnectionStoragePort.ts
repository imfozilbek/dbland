import { Connection } from "../../domain/entities/Connection"
import { DecryptedCredentials } from "../../domain/value-objects/Credentials"

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
