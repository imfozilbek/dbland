import { describe, expect, it } from "vitest"
import { ConnectionError } from "./ConnectionError"
import { DomainError, ErrorCode, isDomainError } from "./DomainError"
import { QueryError } from "./QueryError"
import { StorageError } from "./StorageError"

describe("DomainError hierarchy", () => {
    it("preserves the cause through ES2022 Error.cause", () => {
        const root = new Error("network down")
        const wrapped = ConnectionError.refused("conn-1", root)

        expect(wrapped.cause).toBe(root)
    })

    it("sets the constructor name on subclasses for stack-trace clarity", () => {
        expect(ConnectionError.notFound("x").name).toBe("ConnectionError")
        expect(QueryError.invalidSyntax("missing brace").name).toBe("QueryError")
        expect(StorageError.readFailed("getConnection").name).toBe("StorageError")
    })

    it("ConnectionError factory codes match the discriminator", () => {
        expect(ConnectionError.notFound("x").code).toBe(ErrorCode.CONNECTION_NOT_FOUND)
        expect(ConnectionError.alreadyConnected("x").code).toBe(
            ErrorCode.CONNECTION_ALREADY_CONNECTED,
        )
        expect(ConnectionError.refused("x").code).toBe(ErrorCode.CONNECTION_REFUSED)
        expect(ConnectionError.timeout("x").code).toBe(ErrorCode.CONNECTION_TIMEOUT)
        expect(ConnectionError.authFailed("x").code).toBe(ErrorCode.AUTH_FAILED)
    })

    it("QueryError factory codes match the discriminator", () => {
        expect(QueryError.invalidSyntax("x").code).toBe(ErrorCode.QUERY_INVALID_SYNTAX)
        expect(QueryError.executionFailed("x").code).toBe(ErrorCode.QUERY_EXECUTION_FAILED)
        expect(QueryError.languageMismatch("mongodb", "redis").code).toBe(
            ErrorCode.QUERY_LANGUAGE_MISMATCH,
        )
    })

    it("StorageError factory codes match the discriminator", () => {
        expect(StorageError.readFailed("op").code).toBe(ErrorCode.STORAGE_READ_FAILED)
        expect(StorageError.writeFailed("op").code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    })

    it("isDomainError identifies the hierarchy and ignores plain Errors", () => {
        expect(isDomainError(ConnectionError.notFound("x"))).toBe(true)
        expect(isDomainError(QueryError.invalidSyntax("x"))).toBe(true)
        expect(isDomainError(StorageError.readFailed("x"))).toBe(true)

        expect(isDomainError(new Error("plain"))).toBe(false)
        expect(isDomainError("string error")).toBe(false)
        expect(isDomainError(null)).toBe(false)
        expect(isDomainError(undefined)).toBe(false)
        expect(isDomainError({ code: "BOGUS_CODE", message: "x" })).toBe(false)
    })

    it("isDomainError rejects Errors with a non-discriminator code", () => {
        const fake = new Error("looks like one")
        ;(fake as unknown as { code: string }).code = "TOTALLY_MADE_UP"
        expect(isDomainError(fake)).toBe(false)
    })

    it("DomainError remains assignable to Error (instanceof check)", () => {
        const err: unknown = ConnectionError.timeout("c1")
        expect(err instanceof Error).toBe(true)
        expect(err instanceof DomainError).toBe(true)
        expect(err instanceof ConnectionError).toBe(true)
    })
})
