import { describe, expect, it } from "vitest"
import { createDatabase } from "./Database"
import { DatabaseType } from "../value-objects/DatabaseType"

describe("Database.createDatabase", () => {
    it("creates a Database with name and type", () => {
        const db = createDatabase("admin", DatabaseType.MongoDB)
        expect(db.name).toBe("admin")
        expect(db.type).toBe(DatabaseType.MongoDB)
    })

    it("attaches optional metadata when provided", () => {
        const db = createDatabase("metrics", DatabaseType.MongoDB, {
            sizeBytes: 1_000_000,
            collectionCount: 4,
            isEmpty: false,
        })
        expect(db.sizeBytes).toBe(1_000_000)
        expect(db.collectionCount).toBe(4)
        expect(db.isEmpty).toBe(false)
    })
})
