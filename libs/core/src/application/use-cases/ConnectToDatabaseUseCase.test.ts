import { describe, expect, it, vi } from "vitest"
import { ConnectToDatabaseUseCase } from "./ConnectToDatabaseUseCase"
import { ConnectionGroup, ConnectionStoragePort } from "../ports/ConnectionStoragePort"
import { Connection, ConnectionStatus } from "../../domain/entities/Connection"
import { DatabaseType } from "../../domain/value-objects/DatabaseType"
import { ConnectionConfig } from "../../domain/value-objects/ConnectionConfig"
import { makeAdapterStub } from "./test-helpers"

function makeConnection(overrides: Partial<Connection> = {}): Connection {
    const config: ConnectionConfig = {
        type: DatabaseType.MongoDB,
        name: "test",
        host: "localhost",
        port: 27017,
    }
    return {
        id: "c1",
        name: "test",
        type: DatabaseType.MongoDB,
        config,
        status: ConnectionStatus.Disconnected,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }
}

function makeStorage(overrides: Partial<ConnectionStoragePort> = {}): ConnectionStoragePort {
    const stub = {
        getConnections: async () => [],
        getConnection: async () => null,
        saveConnection: async () => undefined,
        updateConnection: async () => undefined,
        deleteConnection: async () => undefined,
        getCredentials: async () => null,
        saveCredentials: async () => undefined,
        deleteCredentials: async () => undefined,
        getGroups: async () => [],
        saveGroup: async (_g: ConnectionGroup) => undefined,
        deleteGroup: async () => undefined,
        exportConnections: async () => "",
        importConnections: async () => undefined,
    } as unknown as ConnectionStoragePort
    return { ...stub, ...overrides }
}

describe("ConnectToDatabaseUseCase", () => {
    it("returns failure when the connection is not in storage", async () => {
        const useCase = new ConnectToDatabaseUseCase(
            makeStorage({ getConnection: async () => null }),
            () => makeAdapterStub(),
        )
        const out = await useCase.execute({ connectionId: "missing" })
        expect(out.success).toBe(false)
        expect(out.error).toMatch(/not found/)
    })

    it("transitions Disconnected → Connecting → Connected and emits the events in order", async () => {
        const stored = makeConnection()
        const updated = vi.fn().mockResolvedValue(undefined)
        const useCase = new ConnectToDatabaseUseCase(
            makeStorage({
                getConnection: async () => stored,
                updateConnection: updated,
            }),
            () => makeAdapterStub({ isConnected: false }),
        )

        const out = await useCase.execute({ connectionId: "c1" })

        expect(out.success).toBe(true)
        expect(out.connection?.status).toBe(ConnectionStatus.Connected)

        const types = out.events.map((e) => e.type)
        expect(types[0]).toBe("connection.status_changed")
        expect(types[types.length - 1]).toBe("connection.established")

        // updateConnection is called with the final Connected status + lastConnectedAt
        expect(updated).toHaveBeenCalledWith(
            "c1",
            expect.objectContaining({
                status: ConnectionStatus.Connected,
                lastConnectedAt: expect.any(Date),
            }),
        )
    })

    it("falls into the Error status and emits connection.failed when adapter.connect throws", async () => {
        const stored = makeConnection()
        const updated = vi.fn().mockResolvedValue(undefined)
        const useCase = new ConnectToDatabaseUseCase(
            makeStorage({ getConnection: async () => stored, updateConnection: updated }),
            () =>
                makeAdapterStub({
                    connect: async () => {
                        throw new Error("DNS resolution failed")
                    },
                }),
        )

        const out = await useCase.execute({ connectionId: "c1" })

        expect(out.success).toBe(false)
        expect(out.error).toBe("DNS resolution failed")
        expect(out.connection?.status).toBe(ConnectionStatus.Error)

        const lastEvent = out.events[out.events.length - 1]
        expect(lastEvent.type).toBe("connection.failed")

        // updateConnection should be called with Error status (no lastConnectedAt)
        const lastCall = updated.mock.calls[updated.mock.calls.length - 1]
        expect(lastCall[1]).toEqual({ status: ConnectionStatus.Error })
    })

    it("merges decrypted credentials into the adapter config when storage has them", async () => {
        const stored = makeConnection({
            config: {
                type: DatabaseType.MongoDB,
                name: "test",
                host: "localhost",
                port: 27017,
                auth: { username: "alice" },
            },
        })
        const adapterConnect = vi.fn().mockResolvedValue(undefined)
        const useCase = new ConnectToDatabaseUseCase(
            makeStorage({
                getConnection: async () => stored,
                getCredentials: async () => ({ password: "s3cret" }),
            }),
            () => makeAdapterStub({ connect: adapterConnect }),
        )

        await useCase.execute({ connectionId: "c1" })

        const passedConfig = adapterConnect.mock.calls[0][0]
        expect(passedConfig.auth.username).toBe("alice")
        expect(passedConfig.auth.password).toBe("s3cret")
    })
})
