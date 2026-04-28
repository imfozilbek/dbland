import { describe, expect, it } from "vitest"
import { createDatabase, isSystemDatabase } from "./Database"
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

describe("Database.isSystemDatabase", () => {
    it("returns true for the three MongoDB metadata databases", () => {
        expect(isSystemDatabase(createDatabase("admin", DatabaseType.MongoDB))).toBe(true)
        expect(isSystemDatabase(createDatabase("config", DatabaseType.MongoDB))).toBe(true)
        expect(isSystemDatabase(createDatabase("local", DatabaseType.MongoDB))).toBe(true)
    })

    it("returns false for ordinary user databases", () => {
        expect(isSystemDatabase(createDatabase("appdata", DatabaseType.MongoDB))).toBe(false)
        expect(isSystemDatabase(createDatabase("Admin", DatabaseType.MongoDB))).toBe(false) // case-sensitive
    })

    it("returns false for Redis (no named system databases)", () => {
        expect(isSystemDatabase(createDatabase("admin", DatabaseType.Redis))).toBe(false)
        expect(isSystemDatabase(createDatabase("0", DatabaseType.Redis))).toBe(false)
    })
})
