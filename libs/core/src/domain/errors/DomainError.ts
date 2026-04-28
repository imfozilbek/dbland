/**
 * Discriminator codes for every domain error in the application. The UI uses
 * the code (not the message) to decide whether to retry, prompt for
 * credentials, surface a destructive toast, or open a configuration dialog —
 * so the set is deliberately small and enumerable.
 *
 * New codes must come from a real recovery path the UI knows how to take.
 * Don't add codes to be more granular for logging — that's what the message
 * and `cause` chain are for.
 */
export const ErrorCode = {
    // Connection lifecycle
    CONNECTION_NOT_FOUND: "CONNECTION_NOT_FOUND",
    CONNECTION_ALREADY_CONNECTED: "CONNECTION_ALREADY_CONNECTED",
    CONNECTION_REFUSED: "CONNECTION_REFUSED",
    CONNECTION_TIMEOUT: "CONNECTION_TIMEOUT",
    AUTH_FAILED: "AUTH_FAILED",

    // Query execution
    QUERY_INVALID_SYNTAX: "QUERY_INVALID_SYNTAX",
    QUERY_EXECUTION_FAILED: "QUERY_EXECUTION_FAILED",
    QUERY_LANGUAGE_MISMATCH: "QUERY_LANGUAGE_MISMATCH",

    // Storage / persistence
    STORAGE_READ_FAILED: "STORAGE_READ_FAILED",
    STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED",

    // Catch-all — only when none of the above fit. Prefer adding a new
    // discriminator over leaning on this.
    UNKNOWN: "UNKNOWN",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Base class every domain error inherits from. Carries:
 *   - `code`     a discriminated value the UI / store / observability layer
 *                can branch on without parsing strings,
 *   - `message`  a human-readable line *for developers* (logs, error tracker);
 *                the UI should localise via the code, not echo the message,
 *   - `cause`    the underlying exception when wrapping a lower-level error,
 *                preserved through the standard ES2022 `.cause` chain.
 *
 * Subclasses set their own `code` default so `throw new ConnectionError(...)`
 * stays terse at the call site.
 */
export abstract class DomainError extends Error {
    abstract readonly code: ErrorCode

    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options as ErrorOptions | undefined)
        this.name = new.target.name
    }
}

/**
 * Type guard. Lets a store / use case write
 * `if (isDomainError(err)) { switch (err.code) … }` without an `instanceof`
 * dance, which is useful when errors cross worker / IPC boundaries and lose
 * their prototype.
 */
export function isDomainError(value: unknown): value is DomainError {
    if (!(value instanceof Error)) {
        return false
    }
    const code = (value as unknown as { code?: unknown }).code
    return typeof code === "string" && (Object.values(ErrorCode) as string[]).includes(code)
}
