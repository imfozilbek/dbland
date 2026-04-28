import { describe, expect, it } from "vitest"
import {
    canRunAgainst,
    createQuery,
    createQueryHistoryEntry,
    DEFAULT_SLOW_QUERY_THRESHOLD_MS,
    getQueryLanguage,
    isSlow,
    QueryLanguage,
} from "./Query"
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

describe("Query.canRunAgainst", () => {
    it("accepts a MongoDB query against a MongoDB connection", () => {
        const q = createQuery("{}", QueryLanguage.MongoDB)
        expect(canRunAgainst(q, DatabaseType.MongoDB)).toBe(true)
    })

    it("accepts a Redis CLI query against a Redis connection", () => {
        const q = createQuery("KEYS *", QueryLanguage.RedisCLI)
        expect(canRunAgainst(q, DatabaseType.Redis)).toBe(true)
    })

    it("rejects a MongoDB query against a Redis connection", () => {
        const q = createQuery("{}", QueryLanguage.MongoDB)
        expect(canRunAgainst(q, DatabaseType.Redis)).toBe(false)
    })

    it("rejects a Redis query against a MongoDB connection", () => {
        const q = createQuery("KEYS *", QueryLanguage.RedisCLI)
        expect(canRunAgainst(q, DatabaseType.MongoDB)).toBe(false)
    })
})

describe("Query.isSlow", () => {
    it("uses the default threshold (1000ms) when none is provided", () => {
        expect(DEFAULT_SLOW_QUERY_THRESHOLD_MS).toBe(1000)
        expect(isSlow(createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 999, true))).toBe(false)
        expect(isSlow(createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 1000, true))).toBe(true)
        expect(isSlow(createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 5000, true))).toBe(true)
    })

    it("respects an explicit lower threshold (e.g. profiler panel set to 100ms)", () => {
        const entry = createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 250, true)
        expect(isSlow(entry, 100)).toBe(true)
        expect(isSlow(entry, 500)).toBe(false)
    })

    it("treats a zero-millisecond execution as not slow", () => {
        // Edge: instant queries (cached, no-op) shouldn't trigger the
        // "slow" badge regardless of the threshold the caller picked.
        expect(isSlow(createQueryHistoryEntry("{}", QueryLanguage.MongoDB, 0, true), 1)).toBe(false)
    })
})
