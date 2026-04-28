import { describe, expect, it, vi } from "vitest"
import { DisconnectFromDatabaseUseCase } from "./DisconnectFromDatabaseUseCase"
import { ConnectionGroup, ConnectionStoragePort } from "../ports/ConnectionStoragePort"
import { AdapterRegistryPort } from "../ports/AdapterRegistryPort"
import { Connection, ConnectionStatus } from "../../domain/entities/Connection"
import { DatabaseType } from "../../domain/value-objects/DatabaseType"

function makeConnection(overrides: Partial<Connection> = {}): Connection {
    return {
        id: "c1",
        name: "test",
        type: DatabaseType.MongoDB,
        config: {
            type: DatabaseType.MongoDB,
            name: "test",
            host: "localhost",
            port: 27017,
        },
        status: ConnectionStatus.Connected,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }
}

function makeStorage(overrides: Partial<ConnectionStoragePort> = {}): ConnectionStoragePort {
    return {
        getConnections: async () => [],
        getConnection: async () => null,
        saveConnection: async () => undefined,
        updateConnection: async () => undefined,
        persistConnectionTransition: async () => undefined,
        deleteConnection: async () => undefined,
        getCredentials: async () => null,
        saveCredentials: async () => undefined,
        deleteCredentials: async () => undefined,
        getGroups: async () => [],
        saveGroup: async (_g: ConnectionGroup) => undefined,
        deleteGroup: async () => undefined,
        exportConnections: async () => new Blob(),
        importConnections: async () => ({ imported: 0, skipped: 0 }),
        ...overrides,
    } as unknown as ConnectionStoragePort
}

function makeRegistry(overrides: Partial<AdapterRegistryPort> = {}): AdapterRegistryPort {
    return {
        register: async () => undefined,
        get: () => undefined,
        has: () => false,
        release: async () => undefined,
        releaseAll: async () => undefined,
        ...overrides,
    }
}

describe("DisconnectFromDatabaseUseCase", () => {
    it("returns failure when the connection is not in storage", async () => {
        const useCase = new DisconnectFromDatabaseUseCase(
            makeStorage({ getConnection: async () => null }),
            makeRegistry(),
        )

        const out = await useCase.execute({ connectionId: "missing" })

        expect(out.success).toBe(false)
        expect(out.error).toMatch(/not found/)
        expect(out.events).toHaveLength(0)
    })

    it("releases the adapter from the registry", async () => {
        const release = vi.fn().mockResolvedValue(undefined)
        const useCase = new DisconnectFromDatabaseUseCase(
            makeStorage({ getConnection: async () => makeConnection() }),
            makeRegistry({ release }),
        )

        await useCase.execute({ connectionId: "c1" })

        expect(release).toHaveBeenCalledWith("c1")
    })

    it("persists the Disconnected status as a single atomic transition", async () => {
        const transition = vi.fn().mockResolvedValue(undefined)
        const useCase = new DisconnectFromDatabaseUseCase(
            makeStorage({
                getConnection: async () => makeConnection(),
                persistConnectionTransition: transition,
            }),
            makeRegistry(),
        )

        await useCase.execute({ connectionId: "c1" })

        expect(transition).toHaveBeenCalledWith("c1", { status: ConnectionStatus.Disconnected })
    })

    it("emits a status_changed event capturing the previous status", async () => {
        const useCase = new DisconnectFromDatabaseUseCase(
            makeStorage({
                getConnection: async () => makeConnection({ status: ConnectionStatus.Connected }),
            }),
            makeRegistry(),
        )

        const out = await useCase.execute({ connectionId: "c1" })

        expect(out.success).toBe(true)
        expect(out.connection?.status).toBe(ConnectionStatus.Disconnected)
        expect(out.events).toHaveLength(1)
        expect(out.events[0].type).toBe("connection.status_changed")
    })

    it("returns idempotent success without touching registry or storage when already Disconnected", async () => {
        const release = vi.fn().mockResolvedValue(undefined)
        const transition = vi.fn().mockResolvedValue(undefined)
        const useCase = new DisconnectFromDatabaseUseCase(
            makeStorage({
                getConnection: async () =>
                    makeConnection({ status: ConnectionStatus.Disconnected }),
                persistConnectionTransition: transition,
            }),
            makeRegistry({ release }),
        )

        const out = await useCase.execute({ connectionId: "c1" })

        expect(out.success).toBe(true)
        expect(out.connection?.status).toBe(ConnectionStatus.Disconnected)
        expect(out.events).toHaveLength(0)
        expect(release).not.toHaveBeenCalled()
        expect(transition).not.toHaveBeenCalled()
    })

    it("releases the adapter even if persistence is slow — order: release first, then persist", async () => {
        const calls: string[] = []
        const release = vi.fn().mockImplementation(async () => {
            calls.push("release")
        })
        const transition = vi.fn().mockImplementation(async () => {
            calls.push("persist")
        })

        const useCase = new DisconnectFromDatabaseUseCase(
            makeStorage({
                getConnection: async () => makeConnection(),
                persistConnectionTransition: transition,
            }),
            makeRegistry({ release }),
        )

        await useCase.execute({ connectionId: "c1" })

        expect(calls).toEqual(["release", "persist"])
    })
})
