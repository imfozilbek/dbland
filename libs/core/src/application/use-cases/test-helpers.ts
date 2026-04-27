import { DatabaseAdapterPort } from "../ports/DatabaseAdapterPort"
import { DatabaseType } from "../../domain/value-objects/DatabaseType"
import { QueryResult } from "../../domain/value-objects/QueryResult"

/**
 * Build a fully-typed QueryResult for use-case tests with sane defaults.
 */
export function makeQueryResult(overrides: Partial<QueryResult> = {}): QueryResult {
    return {
        success: true,
        documents: [],
        stats: {
            executionTimeMs: 0,
            documentsReturned: 0,
        },
        ...overrides,
    }
}

/**
 * Build a complete DatabaseAdapterPort stub for tests. Every method has a
 * benign default so individual tests only override what they care about.
 */
export function makeAdapterStub(overrides: Partial<DatabaseAdapterPort> = {}): DatabaseAdapterPort {
    const stub: DatabaseAdapterPort = {
        type: DatabaseType.MongoDB,
        isConnected: true,
        connect: async () => undefined,
        disconnect: async () => undefined,
        testConnection: async () => true,
        getDatabases: async () => [],
        getCollections: async () => [],
        getCollectionStats: async () => {
            throw new Error("not stubbed")
        },
        executeQuery: async () => makeQueryResult(),
        getDocuments: async () => makeQueryResult(),
        insertDocuments: async () => ({ insertedCount: 0, insertedIds: [] }),
        updateDocuments: async () => ({ matchedCount: 0, modifiedCount: 0 }),
        deleteDocuments: async () => ({ deletedCount: 0 }),
        exportData: async () => new Blob(),
        importData: async () => ({ success: true, documentsImported: 0 }),
    }
    return { ...stub, ...overrides }
}
