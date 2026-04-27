import { describe, expect, it } from "vitest"
import { createQuery, createQueryHistoryEntry, getQueryLanguage, QueryLanguage } from "./Query"
import { DatabaseType } from "../value-objects/DatabaseType"

describe("Query.getQueryLanguage", () => {
    it("maps MongoDB → MongoDB", () => {
        expect(getQueryLanguage(DatabaseType.MongoDB)).toBe(QueryLanguage.MongoDB)
    })

    it("maps Redis → RedisCLI", () => {
        expect(getQueryLanguage(DatabaseType.Redis)).toBe(QueryLanguage.RedisCLI)
    })
})

describe("Query.createQuery", () => {
    it("populates id, query text, language and createdAt", () => {
        const q = createQuery("db.users.find()", QueryLanguage.MongoDB)
        expect(q.id).toBeDefined()
        expect(q.query).toBe("db.users.find()")
        expect(q.language).toBe(QueryLanguage.MongoDB)
        expect(q.createdAt).toBeInstanceOf(Date)
    })

    it("forwards optional metadata (name, tags, isFavorite)", () => {
        const q = createQuery("KEYS *", QueryLanguage.RedisCLI, {
            name: "list keys",
            tags: ["admin"],
            isFavorite: true,
            databaseName: "db0",
        })
        expect(q.name).toBe("list keys")
        expect(q.tags).toEqual(["admin"])
        expect(q.isFavorite).toBe(true)
        expect(q.databaseName).toBe("db0")
    })
})

describe("Query.createQueryHistoryEntry", () => {
    it("captures the basic execution metadata", () => {
        const entry = createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 12, true)
        expect(entry.id).toBeDefined()
        expect(entry.query).toBe("{}")
        expect(entry.language).toBe(QueryLanguage.MongoDB)
        expect(entry.executionTimeMs).toBe(12)
        expect(entry.success).toBe(true)
        expect(entry.executedAt).toBeInstanceOf(Date)
    })

    it("forwards database / collection / resultCount / error options", () => {
        const entry = createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 5, false, {
            databaseName: "app",
            collectionName: "users",
            resultCount: 0,
            error: "syntax error",
        })
        expect(entry.databaseName).toBe("app")
        expect(entry.collectionName).toBe("users")
        expect(entry.resultCount).toBe(0)
        expect(entry.error).toBe("syntax error")
        expect(entry.success).toBe(false)
    })
})
