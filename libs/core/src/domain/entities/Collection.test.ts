import { describe, expect, it } from "vitest"
import { createCollection } from "./Collection"
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
