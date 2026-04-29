import { describe, expect, it, vi } from "vitest"
import { ConnectionError } from "../../domain/errors/ConnectionError"
import { ConsoleLogger } from "./ConsoleLogger"

function fakeSink(): {
    debug: ReturnType<typeof vi.fn>
    info: ReturnType<typeof vi.fn>
    warn: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
} {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}

describe("ConsoleLogger", () => {
    it("forwards each level to the matching sink method", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "debug", sink })

        logger.debug("d")
        logger.info("i")
        logger.warn("w")
        logger.error("e")

        expect(sink.debug).toHaveBeenCalledTimes(1)
        expect(sink.info).toHaveBeenCalledTimes(1)
        expect(sink.warn).toHaveBeenCalledTimes(1)
        expect(sink.error).toHaveBeenCalledTimes(1)
    })

    it("filters out levels below the threshold", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "warn", sink })

        logger.debug("dropped")
        logger.info("dropped")
        logger.warn("kept")
        logger.error("kept")

        expect(sink.debug).not.toHaveBeenCalled()
        expect(sink.info).not.toHaveBeenCalled()
        expect(sink.warn).toHaveBeenCalledOnce()
        expect(sink.error).toHaveBeenCalledOnce()
    })

    it("redacts top-level sensitive keys", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "info", sink })

        logger.info("connecting", { host: "db.local", password: "secret123" })

        const [, payload] = sink.info.mock.calls[0]
        expect(payload).toMatchObject({ host: "db.local", password: "[REDACTED]" })
    })

    it("redacts nested sensitive keys one level deep", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "info", sink })

        logger.info("connecting", {
            connection: { id: "c1", password: "secret", token: "t" },
        })

        const [, payload] = sink.info.mock.calls[0] as [string, Record<string, unknown>]
        expect(payload.connection).toMatchObject({
            id: "c1",
            password: "[REDACTED]",
            token: "[REDACTED]",
        })
    })

    it("merges baked-in scope context with per-call context", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({
            level: "info",
            context: { useCase: "Connect" },
            sink,
        })

        logger.info("trying", { connectionId: "c1" })

        expect(sink.info).toHaveBeenCalledWith("trying", {
            useCase: "Connect",
            connectionId: "c1",
        })
    })

    it("child() returns a logger with merged scope", () => {
        const sink = fakeSink()
        const parent = new ConsoleLogger({
            level: "info",
            context: { useCase: "Connect" },
            sink,
        })
        const child = parent.child?.({ connectionId: "c1" })

        child?.info("trying")

        expect(sink.info).toHaveBeenCalledWith("trying", {
            useCase: "Connect",
            connectionId: "c1",
        })
    })

    it("redacts sensitive keys regardless of casing — Password / AUTH_PASSWORD / apiKey all match", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "info", sink })

        logger.info("trying", {
            Password: "p1",
            AUTH_PASSWORD: "p2",
            apiKey: "k1",
            random: "kept",
        })

        const [, payload] = sink.info.mock.calls[0] as [string, Record<string, unknown>]
        expect(payload).toMatchObject({
            Password: "[REDACTED]",
            AUTH_PASSWORD: "[REDACTED]",
            apiKey: "[REDACTED]",
            random: "kept",
        })
    })

    it("strips URI userinfo from the log message itself", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "warn", sink })

        // A common foot-gun: callers concatenate the URI into the message.
        logger.warn("connect failed for mongodb://alice:hunter2@db.local:27017")

        const [message] = sink.warn.mock.calls[0]
        expect(message).toBe("connect failed for mongodb://[REDACTED]@db.local:27017")
    })

    it("redacts URI userinfo in non-user:pass shapes (regression: redis password-only URLs)", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "warn", sink })

        // The previous narrower regex required a `:` *inside* the
        // userinfo and silently let these slip:
        //   - redis://:secret@host       (password only, no user)
        //   - mongodb://token@host       (token-as-username, no colon)
        logger.warn("connect failed for redis://:supersecret@redis.local:6379")
        logger.warn("connect failed for mongodb://accesstoken@cluster.example.com")

        expect(sink.warn.mock.calls[0]?.[0]).toBe(
            "connect failed for redis://[REDACTED]@redis.local:6379",
        )
        expect(sink.warn.mock.calls[1]?.[0]).toBe(
            "connect failed for mongodb://[REDACTED]@cluster.example.com",
        )
    })

    it("redacts URI userinfo and password=… patterns from error.message", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "error", sink })

        const err = new Error('failed: mongodb://alice:hunter2@db.local — password="hunter2"')
        logger.error("connect failed", err)

        const [, payload] = sink.error.mock.calls[0] as [string, Record<string, unknown>]
        const errorPayload = payload.error as Record<string, unknown>
        expect(errorPayload.message).toBe(
            "failed: mongodb://[REDACTED]@db.local — password=[REDACTED]",
        )
    })

    it("serialises Error.cause chain on .error()", () => {
        const sink = fakeSink()
        const logger = new ConsoleLogger({ level: "error", sink })
        const root = new Error("ECONNREFUSED")
        const wrapped = ConnectionError.refused("c1", root)

        logger.error("connect failed", wrapped, { connectionId: "c1" })

        const [, payload] = sink.error.mock.calls[0] as [string, Record<string, unknown>]
        expect(payload).toMatchObject({
            connectionId: "c1",
            error: expect.objectContaining({
                name: "ConnectionError",
                code: "CONNECTION_REFUSED",
                cause: expect.objectContaining({ name: "Error", message: "ECONNREFUSED" }),
            }) as unknown,
        })
    })
})
