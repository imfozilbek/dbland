import { isDomainError } from "../domain/errors/DomainError"

/**
 * Pull a user-visible message out of any thrown value.
 *
 * Stores and adapter callers used to do `set({ error: String(error) })`
 * everywhere, which collapses non-`Error` throwables to
 * `"[object Object]"` and loses the structured `code` discriminator
 * carried by the `DomainError` hierarchy. This helper:
 *
 *   - returns `error.message` for `DomainError` (and exposes `.code`
 *     to the caller via `extractErrorCode` below for branching),
 *   - returns `error.message` for plain `Error` instances,
 *   - returns the string as-is for `string` throws (some Tauri
 *     bridges still throw plain strings),
 *   - JSON-stringifies anything else so we at least get diagnostic
 *     value instead of `"[object Object]"`,
 *   - never throws — useful in catch blocks where a re-throw at the
 *     extraction site is the worst possible failure mode.
 */
export function extractErrorMessage(error: unknown): string {
    if (isDomainError(error)) {
        return error.message
    }
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === "string") {
        return error
    }
    if (error === undefined) {
        return "undefined"
    }
    if (error === null) {
        return "null"
    }
    return safeJsonStringify(error)
}

/**
 * Wrap `JSON.stringify` with a stricter return-type contract. The lib
 * typing on `JSON.stringify` is `(value: any) => string`, which the
 * `no-unsafe-return` rule (correctly) flags when a caller forwards the
 * result. Pinning the return type here gives us a single annotated
 * boundary instead of suppressing the rule at every call site, and
 * the body handles the circular-reference fallback in one place.
 */
/**
 * Last-ditch description of a value the JSON serialiser can't handle
 * (circular references, BigInt, etc.). Returns the well-known
 * `"[object Type]"` string. Wrapped in its own helper because
 * `Object.prototype.toString.call` is typed as returning `any` in the
 * standard lib, and pinning it here means downstream call sites get
 * a real `string`.
 */
function describeAny(value: unknown): string {
    // `Object.prototype.toString.call` returns `any` in the stdlib
    // typings; the runtime contract is the well-known `"[object Type]"`
    // string. Coerce explicitly so callers get the real type.
    const tag = Object.prototype.toString.call(value) as unknown
    return typeof tag === "string" ? tag : "[object Unknown]"
}

function safeJsonStringify(value: unknown): string {
    // `JSON.stringify` and `Object.prototype.toString.call` are typed in
    // the standard lib as accepting / returning `any`, so even though
    // they always produce strings at runtime, the ESLint
    // `no-unsafe-return` rule flags them when forwarded directly. We pin
    // the result through `String()` (which is a no-op on actual strings)
    // to give the typechecker a concrete `string` to follow.
    try {
        const json = JSON.stringify(value) as unknown
        return typeof json === "string" ? json : describeAny(value)
    } catch {
        return describeAny(value)
    }
}

/**
 * Pull the `DomainError.code` discriminator out of an unknown thrown
 * value, or `undefined` if the value isn't a domain error. Lets the
 * UI / store branch on `if (code === ErrorCode.AUTH_FAILED) … ` instead
 * of parsing `error.message` strings (which break the moment a
 * locale or wording changes).
 */
export function extractErrorCode(error: unknown): string | undefined {
    if (isDomainError(error)) {
        return error.code
    }
    return undefined
}
