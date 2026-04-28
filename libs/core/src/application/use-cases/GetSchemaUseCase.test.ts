import { describe, expect, it } from "vitest"
import { GetSchemaUseCase } from "./GetSchemaUseCase"
import { DatabaseType } from "../../domain/value-objects/DatabaseType"
import { Database } from "../../domain/entities/Database"
import { Collection } from "../../domain/entities/Collection"
import { makeAdapterStub } from "./test-helpers"

const db = (name: string): Database => ({ name, type: DatabaseType.MongoDB })
const coll = (name: string, databaseName: string): Collection => ({
    name,
    databaseName,
    type: DatabaseType.MongoDB,
})

describe("GetSchemaUseCase", () => {
    it("fails fast when the connection has no adapter registered", async () => {
        const useCase = new GetSchemaUseCase(() => undefined)
        const out = await useCase.execute({ connectionId: "x" })
        expect(out.success).toBe(false)
        expect(out.error).toMatch(/No active connection/)
    })

    it("fails fast when the adapter exists but is not connected", async () => {
        const useCase = new GetSchemaUseCase(() => makeAdapterStub({ isConnected: false }))
        const out = await useCase.execute({ connectionId: "x" })
        expect(out.success).toBe(false)
        expect(out.error).toBe("Connection is not active")
    })

    it("returns only the requested database's collections when databaseName is provided", async () => {
        const useCase = new GetSchemaUseCase(() =>
            makeAdapterStub({
                getDatabases: async () => [db("d1"), db("d2")],
                getCollections: async (dbName: string) =>
                    dbName === "d1" ? [coll("a", "d1"), coll("b", "d1")] : [coll("c", "d2")],
            }),
        )
        const out = await useCase.execute({ connectionId: "x", databaseName: "d1" })
        expect(out.success).toBe(true)
        expect(out.collections?.map((c) => c.name)).toEqual(["a", "b"])
        expect(out.schema).toBeUndefined()
    })

    it("builds a server → databases → collections tree when called without a databaseName", async () => {
        const useCase = new GetSchemaUseCase(() =>
            makeAdapterStub({
                getDatabases: async () => [db("d1")],
                getCollections: async () => [coll("a", "d1"), coll("b", "d1")],
            }),
        )
        const out = await useCase.execute({ connectionId: "x" })
        expect(out.success).toBe(true)
        expect(out.schema?.type).toBe("server")
        expect(out.schema?.children).toHaveLength(1)
        expect(out.schema?.children?.[0].type).toBe("database")
        expect(out.schema?.children?.[0].children).toHaveLength(2)
        expect(out.schema?.children?.[0].children?.[0].type).toBe("collection")
    })

    it("getCollections() returns the collections for a database", async () => {
        const useCase = new GetSchemaUseCase(() =>
            makeAdapterStub({
                getCollections: async () => [coll("a", "d1")],
            }),
        )
        const out = await useCase.getCollections("x", "d1")
        expect(out.success).toBe(true)
        expect(out.collections?.[0].name).toBe("a")
    })

    it("does not nuke the schema tree when one database's getCollections fails — partial result wins", async () => {
        // Three databases, and the middle one's collection lookup
        // rejects (permission denied, e.g.). The previous Promise.all
        // would throw and the user got nothing; the new Promise.allSettled
        // path keeps d1 and d3 populated and shows d2 with no children.
        const useCase = new GetSchemaUseCase(() =>
            makeAdapterStub({
                getDatabases: async () => [db("d1"), db("d2"), db("d3")],
                getCollections: async (name: string) => {
                    if (name === "d2") {
                        throw new Error("permission denied")
                    }
                    return [coll(`c-${name}`, name)]
                },
            }),
        )

        const out = await useCase.execute({ connectionId: "x" })

        expect(out.success).toBe(true)
        const dbNodes = out.schema?.children ?? []
        expect(dbNodes.map((n) => n.name)).toEqual(["d1", "d2", "d3"])
        expect(dbNodes[0].children).toHaveLength(1)
        expect(dbNodes[1].children).toEqual([]) // failing one, empty but present
        expect(dbNodes[2].children).toHaveLength(1)
    })

    it("surfaces adapter errors as failed output instead of throwing", async () => {
        const useCase = new GetSchemaUseCase(() =>
            makeAdapterStub({
                getDatabases: async () => {
                    throw new Error("network unreachable")
                },
            }),
        )
        const out = await useCase.execute({ connectionId: "x" })
        expect(out.success).toBe(false)
        expect(out.error).toBe("network unreachable")
    })
})
