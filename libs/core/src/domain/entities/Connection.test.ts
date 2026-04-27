import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    canExecuteQuery,
    ConnectionStatus,
    createConnection,
    markConnected,
    markConnecting,
    markDisconnected,
    markFailed,
    updateConnectionStatus,
} from "./Connection"
import { DatabaseType } from "../value-objects/DatabaseType"
import { ConnectionConfig } from "../value-objects/ConnectionConfig"

describe("Connection", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2024-01-01T00:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("createConnection", () => {
        const config: ConnectionConfig = {
            type: DatabaseType.MongoDB,
            name: "Test Connection",
            host: "localhost",
            port: 27017,
        }

        it("should create a connection with generated id", () => {
            const connection = createConnection(config)

            expect(connection.id).toBeDefined()
            expect(connection.name).toBe("Test Connection")
            expect(connection.type).toBe(DatabaseType.MongoDB)
            expect(connection.status).toBe(ConnectionStatus.Disconnected)
            expect(connection.config).toEqual(config)
        })

        it("should create a connection with provided id", () => {
            const connection = createConnection(config, "custom-id")

            expect(connection.id).toBe("custom-id")
        })

        it("should set timestamps", () => {
            const connection = createConnection(config)

            expect(connection.createdAt).toEqual(new Date("2024-01-01T00:00:00Z"))
            expect(connection.updatedAt).toEqual(new Date("2024-01-01T00:00:00Z"))
        })
    })

    describe("updateConnectionStatus", () => {
        const config: ConnectionConfig = {
            type: DatabaseType.MongoDB,
            name: "Test Connection",
            host: "localhost",
            port: 27017,
        }

        it("should update status and updatedAt", () => {
            const connection = createConnection(config, "test-id")

            vi.setSystemTime(new Date("2024-01-01T01:00:00Z"))

            const updated = updateConnectionStatus(connection, ConnectionStatus.Connecting)

            expect(updated.status).toBe(ConnectionStatus.Connecting)
            expect(updated.updatedAt).toEqual(new Date("2024-01-01T01:00:00Z"))
            expect(updated.lastConnectedAt).toBeUndefined()
        })

        it("should set lastConnectedAt when status is Connected", () => {
            const connection = createConnection(config, "test-id")

            vi.setSystemTime(new Date("2024-01-01T01:00:00Z"))

            const updated = updateConnectionStatus(connection, ConnectionStatus.Connected)

            expect(updated.status).toBe(ConnectionStatus.Connected)
            expect(updated.lastConnectedAt).toEqual(new Date("2024-01-01T01:00:00Z"))
        })

        it("should not modify original connection", () => {
            const connection = createConnection(config, "test-id")
            const originalStatus = connection.status

            updateConnectionStatus(connection, ConnectionStatus.Connected)

            expect(connection.status).toBe(originalStatus)
        })
    })

    describe("intent-named transitions", () => {
        const config: ConnectionConfig = {
            type: DatabaseType.MongoDB,
            name: "Test Connection",
            host: "localhost",
            port: 27017,
        }

        it("markConnecting puts the connection into Connecting state", () => {
            const connection = createConnection(config, "id")
            const updated = markConnecting(connection)
            expect(updated.status).toBe(ConnectionStatus.Connecting)
            expect(updated.lastConnectedAt).toBeUndefined()
        })

        it("markConnected stamps lastConnectedAt", () => {
            const connection = createConnection(config, "id")
            vi.setSystemTime(new Date("2024-02-02T00:00:00Z"))
            const updated = markConnected(connection)
            expect(updated.status).toBe(ConnectionStatus.Connected)
            expect(updated.lastConnectedAt).toEqual(new Date("2024-02-02T00:00:00Z"))
        })

        it("markFailed and markDisconnected do NOT stamp lastConnectedAt", () => {
            const c1 = markFailed(createConnection(config, "id"))
            expect(c1.status).toBe(ConnectionStatus.Error)
            expect(c1.lastConnectedAt).toBeUndefined()

            const c2 = markDisconnected(markConnected(createConnection(config, "id")))
            expect(c2.status).toBe(ConnectionStatus.Disconnected)
            // markConnected stamped lastConnectedAt; markDisconnected leaves it alone
            expect(c2.lastConnectedAt).toBeDefined()
        })
    })

    describe("canExecuteQuery", () => {
        const config: ConnectionConfig = {
            type: DatabaseType.MongoDB,
            name: "T",
            host: "localhost",
            port: 27017,
        }

        it("is true only when status is Connected", () => {
            const base = createConnection(config, "id")
            expect(canExecuteQuery(base)).toBe(false)
            expect(canExecuteQuery(markConnecting(base))).toBe(false)
            expect(canExecuteQuery(markConnected(base))).toBe(true)
            expect(canExecuteQuery(markFailed(base))).toBe(false)
            expect(canExecuteQuery(markDisconnected(markConnected(base)))).toBe(false)
        })
    })
})
