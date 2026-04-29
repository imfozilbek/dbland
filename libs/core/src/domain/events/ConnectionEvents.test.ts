import { describe, expect, it } from "vitest"
import { createConnectionEstablishedEvent } from "./ConnectionEvents"
import { type Connection, ConnectionStatus } from "../entities/Connection"
import { DatabaseType } from "../value-objects/DatabaseType"

function makeConnection(): Connection {
    return {
        id: "c1",
        name: "prod",
        type: DatabaseType.MongoDB,
        config: {
            type: DatabaseType.MongoDB,
            name: "prod",
            host: "db.local",
            port: 27017,
            auth: {
                username: "alice",
                password: "hunter2",
                authDatabase: "admin",
            },
            ssh: {
                enabled: true,
                host: "bastion.local",
                port: 22,
                username: "deploy",
                authMethod: "key",
                password: "ssh-pass",
                passphrase: "key-passphrase",
                privateKeyPath: "/Users/me/.ssh/id_rsa",
            },
            connectionString: "mongodb://alice:hunter2@db.local:27017",
        },
        status: ConnectionStatus.Connected,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
}

describe("createConnectionEstablishedEvent", () => {
    it("strips every credential-bearing field from the payload", () => {
        const event = createConnectionEstablishedEvent(makeConnection())

        expect(event.type).toBe("connection.established")
        expect(event.payload.connection.config.auth?.password).toBeUndefined()
        expect(event.payload.connection.config.ssh?.password).toBeUndefined()
        expect(event.payload.connection.config.ssh?.passphrase).toBeUndefined()
        // Path is replaced with [REDACTED] rather than dropped so the event
        // log still records that key auth was in use.
        expect(event.payload.connection.config.ssh?.privateKeyPath).toBe("[REDACTED]")
        expect(event.payload.connection.config.connectionString).toBe("[REDACTED]")
    })

    it("leaves non-secret fields untouched so the event stays diagnostic", () => {
        const event = createConnectionEstablishedEvent(makeConnection())

        expect(event.payload.connection.id).toBe("c1")
        expect(event.payload.connection.name).toBe("prod")
        expect(event.payload.connection.config.host).toBe("db.local")
        expect(event.payload.connection.config.port).toBe(27017)
        expect(event.payload.connection.config.auth?.username).toBe("alice")
        expect(event.payload.connection.config.auth?.authDatabase).toBe("admin")
        expect(event.payload.connection.config.ssh?.host).toBe("bastion.local")
        expect(event.payload.connection.config.ssh?.username).toBe("deploy")
    })

    it("does not mutate the input connection object", () => {
        const input = makeConnection()
        const before = input.config.auth?.password
        createConnectionEstablishedEvent(input)
        expect(input.config.auth?.password).toBe(before)
    })

    it("survives JSON.stringify round-trip with no secrets in the output", () => {
        const event = createConnectionEstablishedEvent(makeConnection())
        const serialised = JSON.stringify(event)
        expect(serialised).not.toContain("hunter2")
        expect(serialised).not.toContain("ssh-pass")
        expect(serialised).not.toContain("key-passphrase")
        expect(serialised).not.toContain("/Users/me/.ssh/id_rsa")
    })
})
