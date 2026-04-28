import { describe, expect, it } from "vitest"
import { ConnectionError } from "../domain/errors/ConnectionError"
import { ErrorCode } from "../domain/errors/DomainError"
import { extractErrorCode, extractErrorMessage } from "./error-extraction"

describe("extractErrorMessage", () => {
    it("returns the message for a DomainError", () => {
        const err = ConnectionError.refused("c1")
        expect(extractErrorMessage(err)).toBe("Connection c1 refused by server")
    })

    it("returns the message for a plain Error", () => {
        expect(extractErrorMessage(new Error("network"))).toBe("network")
    })

    it("returns a string throw verbatim", () => {
        expect(extractErrorMessage("plain string error")).toBe("plain string error")
    })

    it("JSON-stringifies an arbitrary object instead of [object Object]", () => {
        expect(extractErrorMessage({ code: 500, msg: "boom" })).toBe('{"code":500,"msg":"boom"}')
    })

    it("handles null and undefined deterministically", () => {
        expect(extractErrorMessage(null)).toBe("null")
        expect(extractErrorMessage(undefined)).toBe("undefined")
    })

    it("falls back to a description when an object can't be JSON-stringified (circular)", () => {
        const circular: Record<string, unknown> = {}
        circular.self = circular
        const result = extractErrorMessage(circular)
        // Circular objects can't be JSON.stringify'd; we should at least
        // produce *something* renderable, not crash the catch handler.
        expect(typeof result).toBe("string")
        expect(result.length).toBeGreaterThan(0)
    })
})

describe("extractErrorCode", () => {
    it("returns the code for a DomainError", () => {
        const err = ConnectionError.authFailed("c1")
        expect(extractErrorCode(err)).toBe(ErrorCode.AUTH_FAILED)
    })

    it("returns undefined for a plain Error", () => {
        expect(extractErrorCode(new Error("network"))).toBeUndefined()
    })

    it("returns undefined for non-Error values", () => {
        expect(extractErrorCode("string error")).toBeUndefined()
        expect(extractErrorCode({ code: "FAKE_CODE" })).toBeUndefined()
        expect(extractErrorCode(null)).toBeUndefined()
        expect(extractErrorCode(undefined)).toBeUndefined()
    })
})
