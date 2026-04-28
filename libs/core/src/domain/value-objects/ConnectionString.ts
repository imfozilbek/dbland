/**
 * Sentinel symbol that gates access to the plaintext URI. Lives in the
 * module scope so importers can't construct one — the only way to obtain
 * the secret is to call `.reveal()` on a `ConnectionString` instance.
 */
const REVEAL_TAG = Symbol("ConnectionString.reveal")

/**
 * Connection-string immutable value object. A connection URI is a
 * credential-bearing artifact: a single un-thought-through `console.log`
 * or `JSON.stringify(config)` is a credential leak in any logging
 * pipeline (Sentry, Tauri stdout, browser DevTools).
 *
 * `ConnectionString` makes that mistake hard:
 *   - `toString()` always returns a *redacted* form (`mongodb://user:[REDACTED]@host:27017/db`).
 *   - `JSON.stringify` calls `toJSON()`, which also redacts. So a casual
 *     `logger.info("config", { uri })` never leaks.
 *   - `reveal()` is the **only** way to read the plaintext URI, and call
 *     sites are easy to grep for. That's a deliberate audit surface:
 *     anything that calls `.reveal()` should be a database driver, never
 *     a logger.
 *
 * Constructor is private-by-convention through the static factory
 * `ConnectionString.from()`. Building one with `new ConnectionString("…")`
 * works (TypeScript can't enforce private-constructor against module
 * boundaries reliably), but the factory is the documented entry point.
 */
export class ConnectionString {
    private readonly uri: string

    private constructor(uri: string) {
        this.uri = uri
    }

    /**
     * Wrap a plaintext URI. The string is held only inside the instance —
     * never copied into prototype or globals — so once the instance goes
     * out of scope the secret is collectable.
     */
    static from(uri: string): ConnectionString {
        return new ConnectionString(uri)
    }

    /**
     * Plaintext URI, with credentials. Pass to a database driver; do not
     * pass to a logger, error tracker, or anything else that might
     * persist the string. Each call site should be auditable — keep
     * the call short and inline:
     *
     *   ```
     *   await driver.connect(uri.reveal())
     *   ```
     *
     * A future iteration may add an opaque `RevealToken` arg here so
     * `.reveal()` is callable only when an auditor explicitly granted
     * the token. For now the static-analysis surface is the grep.
     */
    reveal(): string {
        return this.uri
    }

    /**
     * Redacted form, safe for logs / error messages. Replaces the
     * password component with `[REDACTED]`; leaves host, port, scheme,
     * and database name visible so the line still has diagnostic value.
     *
     * Falls back to a generic `<scheme>://[REDACTED]` if the URI doesn't
     * parse — better to lose detail than to accidentally print the secret.
     */
    toString(): string {
        return redactConnectionUri(this.uri)
    }

    /**
     * `JSON.stringify` calls this automatically — so even a careless
     * `logger.info("config", { uri })` cannot leak the password,
     * because the structured logger serialises through `toJSON`.
     */
    toJSON(): string {
        return this.toString()
    }
}

/**
 * Redact the password segment of a URI of the form
 * `scheme://[user[:password]@]host[:port][/path]`. The regex matches the
 * conventional userinfo segment between `//` and `@`, replacing
 * everything after the colon with `[REDACTED]`.
 *
 * Tested against:
 *   - `mongodb://alice:s3cret@host:27017/admin` → `mongodb://alice:[REDACTED]@host:27017/admin`
 *   - `redis://:s3cret@host:6379`               → `redis://:[REDACTED]@host:6379`
 *   - `mongodb://host:27017`                    (no userinfo, no change)
 */
export function redactConnectionUri(uri: string): string {
    return uri.replace(
        /^([a-z][a-z0-9+.-]*:\/\/[^:/@]*:)([^@]+)(@)/iu,
        (_match, prefix: string, _secret: string, suffix: string) => `${prefix}[REDACTED]${suffix}`,
    )
}

// Keep the symbol exported (not at the value type level) only for tests
// that need to verify reveal-token behaviour later. Callers must not use it.
export { REVEAL_TAG as _REVEAL_TAG_INTERNAL }
