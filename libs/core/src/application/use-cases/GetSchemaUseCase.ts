import { Collection } from "../../domain/entities/Collection"
import { Database } from "../../domain/entities/Database"
import { DatabaseAdapterPort } from "../ports/DatabaseAdapterPort"
import { LoggerPort, NoopLogger } from "../ports/LoggerPort"

/**
 * Get schema use case input
 */
export interface GetSchemaInput {
    connectionId: string
    databaseName?: string
}

/**
 * Schema tree node
 */
export interface SchemaNode {
    type: "server" | "database" | "collection"
    name: string
    children?: SchemaNode[]
    data?: Database | Collection
}

/**
 * Get schema use case output
 */
export interface GetSchemaOutput {
    success: boolean
    schema?: SchemaNode
    databases?: Database[]
    collections?: Collection[]
    error?: string
}

/**
 * Get schema use case
 * Retrieves database and collection information for the schema browser
 */
export class GetSchemaUseCase {
    private readonly logger: LoggerPort

    constructor(
        private readonly getAdapter: (connectionId: string) => DatabaseAdapterPort | undefined,
        logger?: LoggerPort,
    ) {
        this.logger = logger?.child?.({ useCase: "GetSchema" }) ?? NoopLogger
    }

    /**
     * Get full schema tree
     */
    async execute(input: GetSchemaInput): Promise<GetSchemaOutput> {
        const adapter = this.getAdapter(input.connectionId)
        if (!adapter) {
            return {
                success: false,
                error: `No active connection: ${input.connectionId}`,
            }
        }

        if (!adapter.isConnected) {
            return {
                success: false,
                error: "Connection is not active",
            }
        }

        try {
            if (input.databaseName) {
                // Get collections for specific database
                const collections = await adapter.getCollections(input.databaseName)
                return {
                    success: true,
                    collections,
                }
            }

            // Fetch every database's collections in parallel. The previous
            // sequential `for … await` was an O(n) round-trip walk: with
            // 30 databases on a remote MongoDB it blew well past the
            // 100ms target the perf SLA promises. `Promise.all` keeps the
            // total wall time at one round trip plus the slowest call.
            const databases = await adapter.getDatabases()
            const collectionsPerDb = await Promise.all(
                databases.map(async (db) => adapter.getCollections(db.name)),
            )

            const schema: SchemaNode = {
                type: "server",
                name: "Server",
                children: databases.map((db, i) => ({
                    type: "database" as const,
                    name: db.name,
                    data: db,
                    children: collectionsPerDb[i].map((col) => ({
                        type: "collection" as const,
                        name: col.name,
                        data: col,
                    })),
                })),
            }

            return {
                success: true,
                schema,
                databases,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.logger.error("Schema fetch failed", error)
            return {
                success: false,
                error: errorMessage,
            }
        }
    }

    /**
     * Get databases only
     */
    async getDatabases(connectionId: string): Promise<GetSchemaOutput> {
        const adapter = this.getAdapter(connectionId)
        if (!adapter) {
            return {
                success: false,
                error: `No active connection: ${connectionId}`,
            }
        }

        if (!adapter.isConnected) {
            return {
                success: false,
                error: "Connection is not active",
            }
        }

        try {
            const databases = await adapter.getDatabases()
            return {
                success: true,
                databases,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.logger.error("Schema fetch failed", error)
            return {
                success: false,
                error: errorMessage,
            }
        }
    }

    /**
     * Get collections for a database
     */
    async getCollections(connectionId: string, databaseName: string): Promise<GetSchemaOutput> {
        const adapter = this.getAdapter(connectionId)
        if (!adapter) {
            return {
                success: false,
                error: `No active connection: ${connectionId}`,
            }
        }

        if (!adapter.isConnected) {
            return {
                success: false,
                error: "Connection is not active",
            }
        }

        try {
            const collections = await adapter.getCollections(databaseName)
            return {
                success: true,
                collections,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.logger.error("Schema fetch failed", error)
            return {
                success: false,
                error: errorMessage,
            }
        }
    }
}
