import { describe, expect, it } from "vitest"
import { ExecuteQueryUseCase } from "./ExecuteQueryUseCase"
import { QueryLanguage } from "../../domain/entities/Query"
import { makeAdapterStub, makeQueryResult } from "./test-helpers"

describe("ExecuteQueryUseCase", () => {
    it("fails fast when no adapter is registered for the connection", async () => {
        const useCase = new ExecuteQueryUseCase(() => undefined)

        const out = await useCase.execute({
            connectionId: "missing",
            query: "{}",
            language: QueryLanguage.MongoDB,
        })

        expect(out.success).toBe(false)
        expect(out.result.error).toMatch(/No active connection/)
        expect(out.events).toHaveLength(1)
        expect(out.events[0].type).toBe("query.failed")
        expect(out.historyEntry.success).toBe(false)
    })

    it("fails fast when the adapter is not connected", async () => {
        const adapter = makeAdapterStub({ isConnected: false })
        const useCase = new ExecuteQueryUseCase(() => adapter)

        const out = await useCase.execute({
            connectionId: "c1",
            query: "{}",
            language: QueryLanguage.MongoDB,
        })

        expect(out.success).toBe(false)
        expect(out.result.error).toBe("Connection is not active")
        expect(out.events).toHaveLength(1)
        expect(out.events[0].type).toBe("query.failed")
    })

    it("emits a query.executed event on a successful query and records the result count", async () => {
        const docs = [{ _id: "1" }, { _id: "2" }]
        const adapter = makeAdapterStub({
            executeQuery: async () =>
                makeQueryResult({
                    documents: docs,
                    stats: { executionTimeMs: 12, documentsReturned: docs.length },
                }),
        })
        const useCase = new ExecuteQueryUseCase(() => adapter)

        const out = await useCase.execute({
            connectionId: "c1",
            query: "{ name: 'a' }",
            databaseName: "db1",
            collectionName: "users",
            language: QueryLanguage.MongoDB,
        })

        expect(out.success).toBe(true)
        expect(out.result.documents).toHaveLength(2)
        expect(out.events).toHaveLength(1)
        expect(out.events[0].type).toBe("query.executed")
        expect(out.historyEntry.success).toBe(true)
        expect(out.historyEntry.resultCount).toBe(2)
        expect(out.historyEntry.databaseName).toBe("db1")
        expect(out.historyEntry.collectionName).toBe("users")
    })

    it("emits a query.failed event when the adapter returns success=false", async () => {
        const adapter = makeAdapterStub({
            executeQuery: async () =>
                makeQueryResult({
                    success: false,
                    error: "syntax error near $",
                }),
        })
        const useCase = new ExecuteQueryUseCase(() => adapter)

        const out = await useCase.execute({
            connectionId: "c1",
            query: "{ $bogus }",
            language: QueryLanguage.MongoDB,
        })

        expect(out.success).toBe(false)
        expect(out.events[0].type).toBe("query.failed")
        expect(out.historyEntry.error).toBe("syntax error near $")
    })

    it("turns thrown adapter errors into a failed result without leaking the exception", async () => {
        const adapter = makeAdapterStub({
            executeQuery: async () => {
                throw new Error("connection reset by peer")
            },
        })
        const useCase = new ExecuteQueryUseCase(() => adapter)

        const out = await useCase.execute({
            connectionId: "c1",
            query: "{}",
            language: QueryLanguage.MongoDB,
        })

        expect(out.success).toBe(false)
        expect(out.result.error).toBe("connection reset by peer")
        expect(out.events).toHaveLength(1)
        expect(out.events[0].type).toBe("query.failed")
        expect(out.historyEntry.error).toBe("connection reset by peer")
    })
})
