import * as React from "react"
import { createContext, useContext } from "react"

/* -----------------------------------------------------------------------------
 * Types - shared between platforms
 * -------------------------------------------------------------------------- */

export type DatabaseType = "mongodb" | "redis"
export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

export interface SSHConfig {
    enabled: boolean
    host: string
    port: number
    username: string
    authMethod: "password" | "key" | "agent"
    password?: string
    privateKeyPath?: string
    passphrase?: string
}

export interface SSLConfig {
    enabled: boolean
    rejectUnauthorized: boolean
    caPath?: string
    certPath?: string
    keyPath?: string
}

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
    ssh?: SSHConfig
    ssl?: SSLConfig
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
    ssh?: SSHConfig
    ssl?: SSLConfig
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

export interface ResultDocument {
    _id?: string
    [key: string]: unknown
}

export interface QueryStats {
    executionTimeMs: number
    documentsExamined?: number
    documentsReturned: number
    indexUsed?: string
    bytesRead?: number
}

export interface QueryResult {
    success: boolean
    documents: ResultDocument[]
    stats: QueryStats
    error?: string
    cursor?: {
        hasMore: boolean
        nextCursor?: string
    }
}

export interface QueryHistoryEntry {
    id: number
    connectionId: string
    query: string
    language: string
    databaseName?: string
    collectionName?: string
    executedAt: string
    executionTimeMs: number
    success: boolean
    resultCount: number
    error?: string
}

export interface SavedQuery {
    id: number
    connectionId: string
    name: string
    description?: string
    query: string
    language: string
    databaseName?: string
    collectionName?: string
    tags?: string
    createdAt: string
    updatedAt: string
}

export interface NewSavedQuery {
    connectionId: string
    name: string
    description?: string
    query: string
    language: string
    databaseName?: string
    collectionName?: string
    tags?: string
}

export interface UpdateSavedQuery {
    id: number
    name: string
    description?: string
    query: string
    databaseName?: string
    collectionName?: string
    tags?: string
}

export interface ImportOptions {
    filePath: string
    format: string
    databaseName: string
    collectionName: string
}

export interface ExportOptions {
    filePath: string
    format: string
    databaseName: string
    collectionName: string
    query?: string
}

export interface ImportResult {
    success: boolean
    imported: number
    failed: number
    errors: string[]
}

export interface ExportResult {
    success: boolean
    exported: number
    error?: string
}

export interface AggregationPipelineStage {
    stageType: string
    stageData: Record<string, unknown> | string | number
}

export interface ExecuteAggregationRequest {
    connectionId: string
    databaseName: string
    collectionName: string
    pipeline: AggregationPipelineStage[]
}

export interface PreviewStageRequest {
    connectionId: string
    databaseName: string
    collectionName: string
    pipeline: AggregationPipelineStage[]
    stageIndex: number
    limit?: number
}

export interface AggregationResult {
    success: boolean
    documents: ResultDocument[]
    executionTimeMs: number
    documentsReturned: number
    error?: string
}

export interface Index {
    name: string
    keys: Record<string, unknown>
    unique: boolean
    sparse: boolean
    ttl?: number
    background: boolean
}

export interface CreateIndexRequest {
    connectionId: string
    databaseName: string
    collectionName: string
    keys: Record<string, number>
    unique?: boolean
    sparse?: boolean
    ttlSeconds?: number
    background?: boolean
    name?: string
}

export interface IndexStats {
    name: string
    accesses?: number
    since?: string
}

export interface ScanKeysRequest {
    connectionId: string
    pattern: string
    count?: number
}

export interface ScanKeysResult {
    keys: string[]
    cursor: number
}

export interface GetValueRequest {
    connectionId: string
    key: string
}

export interface GetValueResult {
    value: RedisValue
    ttl: number | null
}

export type RedisValue =
    | { type: "string"; value: string }
    | { type: "list"; values: string[] }
    | { type: "set"; values: string[] }
    | { type: "zset"; values: [string, number][] }
    | { type: "hash"; fields: [string, string][] }
    | { type: "none" }

export interface SetTTLRequest {
    connectionId: string
    key: string
    seconds: number
}

export interface SlowLogEntry {
    id: number
    timestamp: number
    duration: number
    command: string
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

    // Query
    executeQuery: (
        connectionId: string,
        query: string,
        databaseName?: string,
        collectionName?: string,
    ) => Promise<QueryResult>

    // Query History
    getQueryHistory: (connectionId: string, limit?: number) => Promise<QueryHistoryEntry[]>
    deleteQueryHistory: (id: number) => Promise<void>
    clearQueryHistory: (connectionId: string) => Promise<void>
    searchQueryHistory: (
        connectionId: string,
        searchQuery: string,
        limit?: number,
    ) => Promise<QueryHistoryEntry[]>

    // Saved Queries
    getSavedQueries: (connectionId: string) => Promise<SavedQuery[]>
    saveQuery: (query: NewSavedQuery) => Promise<SavedQuery>
    updateSavedQuery: (query: UpdateSavedQuery) => Promise<void>
    deleteSavedQuery: (id: number) => Promise<void>
    searchSavedQueries: (connectionId: string, searchQuery: string) => Promise<SavedQuery[]>
    getSavedQueriesByTag: (connectionId: string, tag: string) => Promise<SavedQuery[]>

    // Document Operations
    getDocument: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
    ) => Promise<ResultDocument>
    updateDocument: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
        update: Record<string, unknown>,
    ) => Promise<boolean>
    deleteDocument: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
    ) => Promise<boolean>
    cloneDocument: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        documentId: string,
    ) => Promise<string>

    // Import/Export
    importData: (connectionId: string, options: ImportOptions) => Promise<ImportResult>
    exportData: (connectionId: string, options: ExportOptions) => Promise<ExportResult>
    openFileDialog: (filters?: string[]) => Promise<string | null>
    saveFileDialog: (defaultName?: string, filters?: string[]) => Promise<string | null>

    // Aggregation
    executeAggregationPipeline: (request: ExecuteAggregationRequest) => Promise<AggregationResult>
    previewPipelineStage: (request: PreviewStageRequest) => Promise<AggregationResult>

    // Indexes
    getIndexes: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
    ) => Promise<Index[]>
    createIndex: (request: CreateIndexRequest) => Promise<string>
    dropIndex: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
        indexName: string,
    ) => Promise<boolean>
    getIndexStats: (
        connectionId: string,
        databaseName: string,
        collectionName: string,
    ) => Promise<IndexStats[]>

    // Redis
    redisScanKeys: (request: ScanKeysRequest) => Promise<ScanKeysResult>
    redisGetValue: (request: GetValueRequest) => Promise<GetValueResult>
    redisSetTTL: (request: SetTTLRequest) => Promise<boolean>
    redisSlowLog: (connectionId: string, count?: number) => Promise<SlowLogEntry[]>
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
    executeQuery: async () => {
        throw new Error("Not implemented")
    },
    getQueryHistory: async () => [],
    deleteQueryHistory: async () => {
        throw new Error("Not implemented")
    },
    clearQueryHistory: async () => {
        throw new Error("Not implemented")
    },
    searchQueryHistory: async () => [],
    getSavedQueries: async () => [],
    saveQuery: async () => {
        throw new Error("Not implemented")
    },
    updateSavedQuery: async () => {
        throw new Error("Not implemented")
    },
    deleteSavedQuery: async () => {
        throw new Error("Not implemented")
    },
    searchSavedQueries: async () => [],
    getSavedQueriesByTag: async () => [],
    getDocument: async () => {
        throw new Error("Not implemented")
    },
    updateDocument: async () => {
        throw new Error("Not implemented")
    },
    deleteDocument: async () => {
        throw new Error("Not implemented")
    },
    cloneDocument: async () => {
        throw new Error("Not implemented")
    },
    importData: async () => {
        throw new Error("Not implemented")
    },
    exportData: async () => {
        throw new Error("Not implemented")
    },
    openFileDialog: async () => null,
    saveFileDialog: async () => null,
    executeAggregationPipeline: async () => {
        throw new Error("Not implemented")
    },
    previewPipelineStage: async () => {
        throw new Error("Not implemented")
    },
    getIndexes: async () => [],
    createIndex: async () => {
        throw new Error("Not implemented")
    },
    dropIndex: async () => {
        throw new Error("Not implemented")
    },
    getIndexStats: async () => [],
    redisScanKeys: async () => ({ keys: [], cursor: 0 }),
    redisGetValue: async () => ({ value: { type: "none" }, ttl: null }),
    redisSetTTL: async () => false,
    redisSlowLog: async () => [],
}
