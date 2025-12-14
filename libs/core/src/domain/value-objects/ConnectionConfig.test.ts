import { describe, expect, it } from "vitest"
import {
    buildConnectionString,
    ConnectionConfig,
    createDefaultConnectionConfig,
} from "./ConnectionConfig"
import { DatabaseType } from "./DatabaseType"

describe("ConnectionConfig", () => {
    describe("createDefaultConnectionConfig", () => {
        it("should create default MongoDB config", () => {
            const config = createDefaultConnectionConfig(DatabaseType.MongoDB)

            expect(config.type).toBe(DatabaseType.MongoDB)
            expect(config.host).toBe("localhost")
            expect(config.port).toBe(27017)
            expect(config.auth?.authDatabase).toBe("admin")
        })

        it("should create default Redis config", () => {
            const config = createDefaultConnectionConfig(DatabaseType.Redis)

            expect(config.type).toBe(DatabaseType.Redis)
            expect(config.host).toBe("localhost")
            expect(config.port).toBe(6379)
        })
    })

    describe("buildConnectionString", () => {
        it("should return connectionString if provided", () => {
            const config: ConnectionConfig = {
                type: DatabaseType.MongoDB,
                name: "test",
                host: "localhost",
                port: 27017,
                connectionString: "mongodb://custom-string",
            }

            expect(buildConnectionString(config)).toBe("mongodb://custom-string")
        })

        it("should build MongoDB connection string without auth", () => {
            const config: ConnectionConfig = {
                type: DatabaseType.MongoDB,
                name: "test",
                host: "localhost",
                port: 27017,
            }

            expect(buildConnectionString(config)).toBe("mongodb://localhost:27017")
        })

        it("should build MongoDB connection string with auth", () => {
            const config: ConnectionConfig = {
                type: DatabaseType.MongoDB,
                name: "test",
                host: "localhost",
                port: 27017,
                auth: {
                    username: "admin",
                    password: "secret",
                    authDatabase: "admin",
                },
            }

            expect(buildConnectionString(config)).toBe(
                "mongodb://admin:secret@localhost:27017/admin",
            )
        })

        it("should encode special characters in MongoDB auth", () => {
            const config: ConnectionConfig = {
                type: DatabaseType.MongoDB,
                name: "test",
                host: "localhost",
                port: 27017,
                auth: {
                    username: "user@domain",
                    password: "pass:word",
                },
            }

            expect(buildConnectionString(config)).toBe(
                "mongodb://user%40domain:pass%3Aword@localhost:27017",
            )
        })

        it("should build Redis connection string without auth", () => {
            const config: ConnectionConfig = {
                type: DatabaseType.Redis,
                name: "test",
                host: "localhost",
                port: 6379,
            }

            expect(buildConnectionString(config)).toBe("redis://localhost:6379")
        })

        it("should build Redis connection string with password", () => {
            const config: ConnectionConfig = {
                type: DatabaseType.Redis,
                name: "test",
                host: "localhost",
                port: 6379,
                auth: {
                    password: "secret",
                },
            }

            expect(buildConnectionString(config)).toBe("redis://:secret@localhost:6379")
        })
    })
})
