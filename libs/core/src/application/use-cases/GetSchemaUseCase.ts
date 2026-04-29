import { Collection } from "../../domain/entities/Collection"
import { Database } from "../../domain/entities/Database"
import { extractErrorMessage } from "../error-extraction"
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
 * Discriminated result of `requireConnectedAdapter`. Lets the public
 * methods early-return the precondition-failure output verbatim instead
 * of re-stringifying the error each time.
 */
type AdapterLookup =
    | { ok: true; adapter: DatabaseAdapterPort }
    | { ok: false; output: GetSchemaOutput }

/**
 * Run a body against a connected adapter, with the standard try/catch
 * + logger.error wrapping. Centralises the four-method-deep pattern of
 * "look up adapter, check connected, run thing, swallow exceptions
 * into a `success: false` payload" that used to be inlined in three
 * sibling methods.
 */
async function runWithAdapter(
    lookup: AdapterLookup,
    body: (adapter: DatabaseAdapterPort) => Promise<GetSchemaOutput>,
    onError: (err: unknown) => void,
): Promise<GetSchemaOutput> {
    if (!lookup.ok) {
        return lookup.output
    }
    try {
        return await body(lookup.adapter)
    } catch (error) {
        onError(error)
        return {
            success: false,
            error: extractErrorMessage(error),
        }
    }
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
     * Resolve the adapter for `connectionId` and confirm it's connected.
     * Returns either the adapter or a ready-to-return error output —
     * collapses the "two if-guards repeated three times" pattern that
     * used to live inline in every public method.
     */
    private requireConnectedAdapter(connectionId: string): AdapterLookup {
        const adapter = this.getAdapter(connectionId)
        if (!adapter) {
            return {
                ok: false,
                output: { success: false, error: `No active connection: ${connectionId}` },
            }
        }
        if (!adapter.isConnected) {
            return {
                ok: false,
                output: { success: false, error: "Connection is not active" },
            }
        }
        return { ok: true, adapter }
    }

    /**
     * Get full schema tree.
     *
     * If the input names a single database, only that database's
     * collections are fetched. Otherwise the entire server tree is
     * built — each database's `getCollections` runs concurrently via
     * `Promise.allSettled`, so a single permission-denied or slow
     * database does not nuke the entire schema fetch (the previous
     * `Promise.all` did exactly that). A failed branch shows up as a
     * collection-less node and the failure is logged.
     */
    async execute(input: GetSchemaInput): Promise<GetSchemaOutput> {
        const lookup = this.requireConnectedAdapter(input.connectionId)
        return runWithAdapter(
            lookup,
            async (adapter) => {
                if (input.databaseName) {
                    const collections = await adapter.getCollections(input.databaseName)
                    return { success: true, collections }
                }

                const databases = await adapter.getDatabases()
                const settled = await Promise.allSettled(
                    databases.map(async (db) => adapter.getCollections(db.name)),
                )

                const collectionsPerDb: Collection[][] = settled.map((r, i) => {
                    if (r.status === "fulfilled") {
                        return r.value
                    }
                    this.logger.warn("Per-database getCollections failed", {
                        connectionId: input.connectionId,
                        database: databases[i].name,
                        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
                    })
                    return []
                })

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

                return { success: true, schema, databases }
            },
            (error) => {
                this.logger.error("Schema fetch failed", error)
            },
        )
    }

    /**
     * Get databases only
     */
    async getDatabases(connectionId: string): Promise<GetSchemaOutput> {
        const lookup = this.requireConnectedAdapter(connectionId)
        return runWithAdapter(
            lookup,
            async (adapter) => ({ success: true, databases: await adapter.getDatabases() }),
            (error) => {
                this.logger.error("Schema fetch failed", error)
            },
        )
    }

    /**
     * Get collections for a database
     */
    async getCollections(connectionId: string, databaseName: string): Promise<GetSchemaOutput> {
        const lookup = this.requireConnectedAdapter(connectionId)
        return runWithAdapter(
            lookup,
            async (adapter) => ({
                success: true,
                collections: await adapter.getCollections(databaseName),
            }),
            (error) => {
                this.logger.error("Schema fetch failed", error)
            },
        )
    }
}
