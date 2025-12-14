import { Collection } from "../../domain/entities/Collection"
import { Database } from "../../domain/entities/Database"
import { ConnectionConfig } from "../../domain/value-objects/ConnectionConfig"
import { DatabaseType } from "../../domain/value-objects/DatabaseType"
import { QueryResult, ResultDocument } from "../../domain/value-objects/QueryResult"

/**
 * Export options
 */
export interface ExportOptions {
    format: "json" | "csv" | "bson"
    databaseName: string
    collectionName: string
    filter?: Record<string, unknown>
    projection?: Record<string, number>
    limit?: number
}

/**
 * Import options
 */
export interface ImportOptions {
    format: "json" | "csv" | "bson"
    databaseName: string
    collectionName: string
    upsert?: boolean
    dropCollection?: boolean
}

/**
 * Import result
 */
export interface ImportResult {
    success: boolean
    documentsImported: number
    errors?: string[]
}

/**
 * Database adapter port interface
 * Each database type must implement this interface
 */
export interface DatabaseAdapterPort {
    /**
     * Database type this adapter handles
     */
    readonly type: DatabaseType

    /**
     * Whether the adapter is currently connected
     */
    readonly isConnected: boolean

    /**
     * Connect to the database
     */
    connect(config: ConnectionConfig): Promise<void>

    /**
     * Disconnect from the database
     */
    disconnect(): Promise<void>

    /**
     * Test the connection without fully connecting
     */
    testConnection(config: ConnectionConfig): Promise<boolean>

    /**
     * Get list of databases
     */
    getDatabases(): Promise<Database[]>

    /**
     * Get list of collections in a database
     */
    getCollections(databaseName: string): Promise<Collection[]>

    /**
     * Get collection statistics
     */
    getCollectionStats(databaseName: string, collectionName: string): Promise<Collection>

    /**
     * Execute a query
     */
    executeQuery(
        query: string,
        databaseName?: string,
        collectionName?: string,
    ): Promise<QueryResult>

    /**
     * Get documents from a collection
     */
    getDocuments(
        databaseName: string,
        collectionName: string,
        options?: {
            filter?: Record<string, unknown>
            projection?: Record<string, number>
            sort?: Record<string, number>
            skip?: number
            limit?: number
        },
    ): Promise<QueryResult>

    /**
     * Insert documents
     */
    insertDocuments(
        databaseName: string,
        collectionName: string,
        documents: ResultDocument[],
    ): Promise<{ insertedCount: number; insertedIds: string[] }>

    /**
     * Update documents
     */
    updateDocuments(
        databaseName: string,
        collectionName: string,
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options?: { upsert?: boolean; multi?: boolean },
    ): Promise<{ matchedCount: number; modifiedCount: number }>

    /**
     * Delete documents
     */
    deleteDocuments(
        databaseName: string,
        collectionName: string,
        filter: Record<string, unknown>,
        options?: { multi?: boolean },
    ): Promise<{ deletedCount: number }>

    /**
     * Export data
     */
    exportData(options: ExportOptions): Promise<Blob>

    /**
     * Import data
     */
    importData(data: Blob, options: ImportOptions): Promise<ImportResult>
}
