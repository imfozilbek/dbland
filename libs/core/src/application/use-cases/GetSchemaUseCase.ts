import { Collection } from "../../domain/entities/Collection"
import { Database } from "../../domain/entities/Database"
import { DatabaseAdapterPort } from "../ports/DatabaseAdapterPort"

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
    constructor(
        private readonly getAdapter: (connectionId: string) => DatabaseAdapterPort | undefined,
    ) {}

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

            // Get all databases and their collections
            const databases = await adapter.getDatabases()
            const schema: SchemaNode = {
                type: "server",
                name: "Server",
                children: [],
            }

            for (const db of databases) {
                const collections = await adapter.getCollections(db.name)
                const dbNode: SchemaNode = {
                    type: "database",
                    name: db.name,
                    data: db,
                    children: collections.map((col) => ({
                        type: "collection" as const,
                        name: col.name,
                        data: col,
                    })),
                }
                schema.children?.push(dbNode)
            }

            return {
                success: true,
                schema,
                databases,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
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
            return {
                success: false,
                error: errorMessage,
            }
        }
    }
}
