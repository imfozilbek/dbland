import { describe, expect, it } from "vitest"
import {
    DEFAULT_HOST,
    DEFAULT_MONGO_AUTH_DATABASE,
    DEFAULT_PORTS,
    DEFAULT_QUERY_LIMIT,
} from "./database-defaults"
import { DatabaseType } from "../value-objects/DatabaseType"

describe("database-defaults", () => {
    it("DEFAULT_PORTS uses each engine's published default", () => {
        // These are convention, not configuration — keep them aligned
        // with the Rust side (see commands/query.rs for the Mongo case).
        expect(DEFAULT_PORTS[DatabaseType.MongoDB]).toBe(27017)
        expect(DEFAULT_PORTS[DatabaseType.Redis]).toBe(6379)
    })

    it("DEFAULT_QUERY_LIMIT matches the Rust commands/query.rs unwrap_or fallback", () => {
        expect(DEFAULT_QUERY_LIMIT).toBe(100)
    })

    it("DEFAULT_HOST is localhost", () => {
        expect(DEFAULT_HOST).toBe("localhost")
    })

    it("DEFAULT_MONGO_AUTH_DATABASE is admin", () => {
        expect(DEFAULT_MONGO_AUTH_DATABASE).toBe("admin")
    })
})
