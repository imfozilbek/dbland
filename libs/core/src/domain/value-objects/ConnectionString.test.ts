import { describe, expect, it } from "vitest"
import { ConnectionString, redactConnectionUri } from "./ConnectionString"

describe("ConnectionString", () => {
    it("reveal() returns the plaintext URI", () => {
        const cs = ConnectionString.from("mongodb://alice:s3cret@host:27017/admin")
        expect(cs.reveal()).toBe("mongodb://alice:s3cret@host:27017/admin")
    })

    it("toString() redacts the password", () => {
        const cs = ConnectionString.from("mongodb://alice:s3cret@host:27017/admin")
        expect(cs.toString()).toBe("mongodb://alice:[REDACTED]@host:27017/admin")
    })

    it("toJSON() redacts the password — JSON.stringify is safe", () => {
        const cs = ConnectionString.from("redis://:s3cret@host:6379")
        expect(JSON.stringify(cs)).toBe('"redis://:[REDACTED]@host:6379"')
    })

    it("String() conversion (the path template literals take) also redacts", () => {
        const cs = ConnectionString.from("mongodb://alice:s3cret@host:27017")
        expect(String(cs)).toBe("mongodb://alice:[REDACTED]@host:27017")
    })

    it("URIs without userinfo are unchanged", () => {
        expect(ConnectionString.from("mongodb://host:27017").toString()).toBe(
            "mongodb://host:27017",
        )
        expect(ConnectionString.from("redis://host:6379").toString()).toBe("redis://host:6379")
    })
})

describe("redactConnectionUri", () => {
    it("redacts only the password segment, leaving username intact", () => {
        expect(redactConnectionUri("mongodb://alice:s3cret@host:27017/admin")).toBe(
            "mongodb://alice:[REDACTED]@host:27017/admin",
        )
    })

    it("redacts Redis-style URIs with empty username", () => {
        expect(redactConnectionUri("redis://:s3cret@host:6379")).toBe(
            "redis://:[REDACTED]@host:6379",
        )
    })

    it("leaves URIs without userinfo unchanged", () => {
        expect(redactConnectionUri("mongodb://host:27017")).toBe("mongodb://host:27017")
    })

    it("doesn't munge unrelated colons in the path or query", () => {
        expect(redactConnectionUri("mongodb://alice:s3cret@host:27017/db?replicaSet=rs0")).toBe(
            "mongodb://alice:[REDACTED]@host:27017/db?replicaSet=rs0",
        )
    })

    it("handles encoded password characters", () => {
        expect(redactConnectionUri("redis://:p%40ss%3Aword@host:6379")).toBe(
            "redis://:[REDACTED]@host:6379",
        )
    })
})
