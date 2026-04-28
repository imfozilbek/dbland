/**
 * Severity levels, ordered. A logger implementation may filter at any
 * threshold — `info` is the conventional default for a release build.
 *
 * Using a string-literal union (not a numeric enum) keeps the on-the-wire
 * shape stable when log records cross the IPC boundary between Tauri's
 * Rust side and the JS side, or get serialised into an external
 * observability pipeline.
 */
export type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Free-form structured context attached to a log call. Goes alongside the
 * message, never inside it — the message stays a fixed template so log
 * aggregators can group occurrences, while variable data goes in `context`
 * for filtering and faceting.
 *
 * Implementations are expected to drop or redact known-sensitive keys
 * (`password`, `token`, etc.). Don't paper over that here — the contract
 * is on the implementation, not the caller.
 */
export type LogContext = Record<string, unknown>

/**
 * Domain-side observability port. Use cases depend on this; concrete
 * implementations (console for dev, structured-JSON for production, sink
 * to Tauri's Rust logger, etc.) live in the infrastructure / app layers.
 *
 * Why a port at all: CLAUDE.md forbids \`console.log\` and the rest of
 * the codebase has been silently swallowing errors with \`console.error\`
 * since the start. With a port, the use case has a place to record what
 * happened without coupling to the host environment, and the test setup
 * can assert on the log shape without intercepting the global console.
 *
 * Methods take a single \`message\` and an optional structured \`context\`.
 * Don't string-interpolate variables into the message — pass them through
 * \`context\` so the message text stays groupable.
 *
 * Why not just \`log(level, …)\` and four shorthands: keeping four explicit
 * methods means ESLint rules against \`level === "debug"\` filtering and
 * generic dispatch typos (\`logger.log("warning", …)\`) don't apply — the
 * compiler enforces the level set.
 */
export interface LoggerPort {
    debug(message: string, context?: LogContext): void
    info(message: string, context?: LogContext): void
    warn(message: string, context?: LogContext): void
    /**
     * \`error\` accepts an optional \`Error\` so the logger can record the
     * stack trace separately from the structured context. Implementations
     * should walk \`error.cause\` to capture wrapped causes.
     */
    error(message: string, error?: unknown, context?: LogContext): void

    /**
     * Optional sub-logger with a fixed scope baked into every record.
     * Useful for use-case-level logs: \`logger.child({ useCase:
     * "ConnectToDatabase" })\` annotates everything from that instance.
     * Default implementations may simply return \`this\`.
     */
    child?(context: LogContext): LoggerPort
}

/**
 * Logger that drops everything on the floor. Useful as a default for
 * callers that don't want to be forced to construct a real logger
 * (tests, transitional code), without each having to roll their own
 * \`{ debug() {}, info() {}, … }\` stub.
 */
export const NoopLogger: LoggerPort = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => NoopLogger,
}
