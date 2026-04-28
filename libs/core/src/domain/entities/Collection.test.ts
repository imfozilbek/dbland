import { describe, expect, it } from "vitest"
import { createCollection, isSystemCollection } from "./Collection"
import { DatabaseType } from "../value-objects/DatabaseType"

describe("Collection.createCollection", () => {
    it("creates a Collection with name, databaseName and type", () => {
        const c = createCollection("users", "app", DatabaseType.MongoDB)
        expect(c.name).toBe("users")
        expect(c.databaseName).toBe("app")
        expect(c.type).toBe(DatabaseType.MongoDB)
    })

    it("forwards optional stats / capped flags", () => {
        const c = createCollection("logs", "app", DatabaseType.MongoDB, {
            capped: true,
            maxDocuments: 1000,
            maxSize: 1024,
            stats: { documentCount: 42, sizeBytes: 4096 },
        })
        expect(c.capped).toBe(true)
        expect(c.maxDocuments).toBe(1000)
        expect(c.stats?.documentCount).toBe(42)
    })
})

describe("Collection.isSystemCollection", () => {
    it("returns true for any MongoDB collection in the system.* namespace", () => {
        expect(
            isSystemCollection(createCollection("system.indexes", "app", DatabaseType.MongoDB)),
        ).toBe(true)
        expect(
            isSystemCollection(createCollection("system.profile", "app", DatabaseType.MongoDB)),
        ).toBe(true)
    })

    it("returns false for ordinary user collections, even if they contain the word 'system'", () => {
        expect(isSystemCollection(createCollection("users", "app", DatabaseType.MongoDB))).toBe(
            false,
        )
        expect(
            isSystemCollection(
                createCollection("operating-system-logs", "app", DatabaseType.MongoDB),
            ),
        ).toBe(false)
    })

    it("never marks Redis keyspaces as system collections", () => {
        expect(isSystemCollection(createCollection("system.foo", "0", DatabaseType.Redis))).toBe(
            false,
        )
    })
})
