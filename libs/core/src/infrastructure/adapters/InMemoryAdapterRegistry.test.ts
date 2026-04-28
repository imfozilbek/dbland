import { describe, expect, it, vi } from "vitest"
import { Connection, ConnectionStatus } from "../../domain/entities/Connection"
import { DatabaseType } from "../../domain/value-objects/DatabaseType"
import { DatabaseAdapterPort } from "../../application/ports/DatabaseAdapterPort"
import { InMemoryAdapterRegistry } from "./InMemoryAdapterRegistry"

function fakeAdapter(overrides: Partial<DatabaseAdapterPort> = {}): DatabaseAdapterPort {
    return {
        type: DatabaseType.MongoDB,
        isConnected: false,
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        executeQuery: vi.fn(),
        getDatabases: vi.fn(),
        getCollections: vi.fn(),
        ping: vi.fn(),
        ...overrides,
    } as unknown as DatabaseAdapterPort
}

function fakeConnection(id: string): Connection {
    return {
        id,
        config: {
            type: DatabaseType.MongoDB,
            name: id,
            host: "localhost",
            port: 27017,
        },
        status: ConnectionStatus.Disconnected,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as Connection
}

describe("InMemoryAdapterRegistry", () => {
    it("register + get round-trips the adapter", async () => {
        const registry = new InMemoryAdapterRegistry()
        const adapter = fakeAdapter()
        await registry.register(fakeConnection("c1"), adapter)

        expect(registry.get("c1")).toBe(adapter)
        expect(registry.has("c1")).toBe(true)
    })

    it("re-registering disconnects the previous adapter", async () => {
        const registry = new InMemoryAdapterRegistry()
        const firstDisconnect = vi.fn().mockResolvedValue(undefined)
        const first = fakeAdapter({ disconnect: firstDisconnect })
        const second = fakeAdapter()

        await registry.register(fakeConnection("c1"), first)
        await registry.register(fakeConnection("c1"), second)

        expect(firstDisconnect).toHaveBeenCalledOnce()
        expect(registry.get("c1")).toBe(second)
    })

    it("re-registering the same adapter is a no-op (no spurious disconnect)", async () => {
        const registry = new InMemoryAdapterRegistry()
        const disconnect = vi.fn().mockResolvedValue(undefined)
        const adapter = fakeAdapter({ disconnect })

        await registry.register(fakeConnection("c1"), adapter)
        await registry.register(fakeConnection("c1"), adapter)

        expect(disconnect).not.toHaveBeenCalled()
    })

    it("release disconnects and removes the adapter", async () => {
        const registry = new InMemoryAdapterRegistry()
        const disconnect = vi.fn().mockResolvedValue(undefined)
        const adapter = fakeAdapter({ disconnect })
        await registry.register(fakeConnection("c1"), adapter)

        await registry.release("c1")

        expect(disconnect).toHaveBeenCalledOnce()
        expect(registry.get("c1")).toBeUndefined()
        expect(registry.has("c1")).toBe(false)
    })

    it("release on an unknown connection is a no-op", async () => {
        const registry = new InMemoryAdapterRegistry()
        await expect(registry.release("missing")).resolves.toBeUndefined()
    })

    it("releaseAll tears down every registered adapter", async () => {
        const registry = new InMemoryAdapterRegistry()
        const aDisconnect = vi.fn().mockResolvedValue(undefined)
        const bDisconnect = vi.fn().mockResolvedValue(undefined)
        await registry.register(fakeConnection("c1"), fakeAdapter({ disconnect: aDisconnect }))
        await registry.register(fakeConnection("c2"), fakeAdapter({ disconnect: bDisconnect }))

        await registry.releaseAll()

        expect(aDisconnect).toHaveBeenCalledOnce()
        expect(bDisconnect).toHaveBeenCalledOnce()
        expect(registry.get("c1")).toBeUndefined()
        expect(registry.get("c2")).toBeUndefined()
    })

    it("a stuck disconnect inside releaseAll doesn't block other adapters", async () => {
        const registry = new InMemoryAdapterRegistry()
        const slowDisconnect = vi.fn().mockRejectedValue(new Error("stuck"))
        const fastDisconnect = vi.fn().mockResolvedValue(undefined)
        await registry.register(fakeConnection("slow"), fakeAdapter({ disconnect: slowDisconnect }))
        await registry.register(fakeConnection("fast"), fakeAdapter({ disconnect: fastDisconnect }))

        await registry.releaseAll()

        expect(slowDisconnect).toHaveBeenCalledOnce()
        expect(fastDisconnect).toHaveBeenCalledOnce()
        expect(registry.has("slow")).toBe(false)
        expect(registry.has("fast")).toBe(false)
    })

    it("a thrown disconnect inside release is swallowed (registry forgets the entry anyway)", async () => {
        const registry = new InMemoryAdapterRegistry()
        const adapter = fakeAdapter({
            disconnect: vi.fn().mockRejectedValue(new Error("server gone")),
        })
        await registry.register(fakeConnection("c1"), adapter)

        await expect(registry.release("c1")).resolves.toBeUndefined()
        expect(registry.has("c1")).toBe(false)
    })
})
