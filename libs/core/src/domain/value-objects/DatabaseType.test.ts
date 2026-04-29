import { describe, expect, it } from "vitest"
import { DatabaseType, getDatabaseTypeDisplayName, isDatabaseType } from "./DatabaseType"

describe("DatabaseType", () => {
    describe("isDatabaseType", () => {
        it("should return true for valid database types", () => {
            expect(isDatabaseType("mongodb")).toBe(true)
            expect(isDatabaseType("redis")).toBe(true)
        })

        it("should return false for invalid database types", () => {
            expect(isDatabaseType("mysql")).toBe(false)
            expect(isDatabaseType("postgresql")).toBe(false)
            expect(isDatabaseType("invalid")).toBe(false)
            expect(isDatabaseType("")).toBe(false)
        })
    })

    describe("getDatabaseTypeDisplayName", () => {
        it("should return correct display names", () => {
            expect(getDatabaseTypeDisplayName(DatabaseType.MongoDB)).toBe("MongoDB")
            expect(getDatabaseTypeDisplayName(DatabaseType.Redis)).toBe("Redis")
        })
    })
})
