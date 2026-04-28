import { LogContext, LoggerPort, LogLevel } from "../../application/ports/LoggerPort"

/**
 * Set of context keys whose values are stripped from every log record before
 * it leaves this logger. Anything matching is replaced with the literal
 * string `"[REDACTED]"`. The list is intentionally narrow — keys that
 * unambiguously carry secrets — because over-redacting hides the very
 * structured data the logger exists to surface.
 *
 * Add to it sparingly; prefer a wrapping branded type at the call site
 * (e.g. a `RedactedString` value object) for everything else.
 */
const SENSITIVE_KEYS = new Set<string>([
    "password",
    "authPassword",
    "sshPassword",
    "passphrase",
    "privateKey",
    "encryptedPassword",
    "encryptedPrivateKey",
    "encryptedPassphrase",
    "token",
    "accessToken",
    "refreshToken",
    "secret",
    "apiKey",
])

const REDACTED = "[REDACTED]"

const LEVEL_RANK: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
}

export interface ConsoleLoggerOptions {
    /**
     * Minimum level to emit. Calls below this are no-ops. Defaults to
     * `"info"` — `debug` should be opt-in.
     */
    level?: LogLevel
    /**
     * Fixed context appended to every record from this logger. `child()`
     * builds new instances with merged context.
     */
    context?: LogContext
    /**
     * Console implementation to write into. Tests pass a fake; the default
     * is the real `console`.
     */
    sink?: Pick<Console, "debug" | "info" | "warn" | "error">
}

/**
 * Redact a context object in place of structured logging. Walks one level
 * deep — that's where secrets typically live (`{ password: "…" }`,
 * `{ credentials: { password: "…" } }`). Going deeper is a different
 * problem; if a caller is dropping a whole credential bag into the log,
 * the right fix is a branded type, not a recursive sweep here.
 */
function redact(context: LogContext): LogContext {
    const redacted: LogContext = {}
    for (const [key, value] of Object.entries(context)) {
        if (SENSITIVE_KEYS.has(key)) {
            redacted[key] = REDACTED
            continue
        }
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const nested = value as LogContext
            const nestedRedacted: LogContext = {}
            for (const [k, v] of Object.entries(nested)) {
                nestedRedacted[k] = SENSITIVE_KEYS.has(k) ? REDACTED : v
            }
            redacted[key] = nestedRedacted
            continue
        }
        redacted[key] = value
    }
    return redacted
}

/**
 * Default `LoggerPort` for desktop / web app code. Routes through
 * `console.{debug,info,warn,error}` so DevTools / Tauri's stdout still
 * surfaces lines naturally, but adds:
 *   - level-based filtering,
 *   - sensitive-key redaction (`password`, `token`, etc.),
 *   - a baked-in scope context so use cases can label their lines once
 *     and have every record carry the label.
 *
 * The real CLAUDE.md rule says "no `console.log`" — `.warn` and `.error`
 * are explicitly fine, and `.debug` / `.info` are routed through the
 * sink option (which a strict app can replace with a Tauri-side logger).
 */
export class ConsoleLogger implements LoggerPort {
    private readonly minRank: number
    private readonly context: LogContext
    private readonly sink: NonNullable<ConsoleLoggerOptions["sink"]>

    constructor(options: ConsoleLoggerOptions = {}) {
        this.minRank = LEVEL_RANK[options.level ?? "info"]
        this.context = options.context ?? {}

        this.sink = options.sink ?? console
    }

    debug(message: string, context?: LogContext): void {
        this.emit("debug", message, undefined, context)
    }

    info(message: string, context?: LogContext): void {
        this.emit("info", message, undefined, context)
    }

    warn(message: string, context?: LogContext): void {
        this.emit("warn", message, undefined, context)
    }

    error(message: string, error?: unknown, context?: LogContext): void {
        this.emit("error", message, error, context)
    }

    child(context: LogContext): LoggerPort {
        return new ConsoleLogger({
            level: this.invertRank(this.minRank),
            context: { ...this.context, ...context },
            sink: this.sink,
        })
    }

    private emit(
        level: LogLevel,
        message: string,
        error: unknown,
        context: LogContext | undefined,
    ): void {
        if (LEVEL_RANK[level] < this.minRank) {
            return
        }

        const merged = redact({ ...this.context, ...(context ?? {}) })
        const payload = error === undefined ? merged : { ...merged, error: serialiseError(error) }

        this.sink[level](message, payload)
    }

    private invertRank(rank: number): LogLevel {
        const entry = (Object.entries(LEVEL_RANK) as [LogLevel, number][]).find(
            ([, r]) => r === rank,
        )
        return entry?.[0] ?? "info"
    }
}

/**
 * Convert any thrown value into a JSON-friendly shape. Walks the
 * `Error.cause` chain so wrapped errors don't lose their root.
 */
function serialiseError(error: unknown): Record<string, unknown> | string {
    if (!(error instanceof Error)) {
        return typeof error === "string" ? error : JSON.stringify(error)
    }
    const out: Record<string, unknown> = {
        name: error.name,
        message: error.message,
    }
    const code = (error as unknown as { code?: unknown }).code
    if (typeof code === "string") {
        out.code = code
    }
    if (error.stack) {
        out.stack = error.stack
    }
    if (error.cause !== undefined) {
        out.cause = serialiseError(error.cause)
    }
    return out
}
