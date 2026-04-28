import {
    DEFAULT_HOST,
    DEFAULT_MONGO_AUTH_DATABASE,
    DEFAULT_PORTS,
} from "../constants/database-defaults"
import { ConnectionString } from "./ConnectionString"
import { DatabaseType } from "./DatabaseType"

/**
 * SSH tunnel configuration
 */
export interface SSHConfig {
    enabled: boolean
    host: string
    port: number
    username: string
    authMethod: "password" | "key" | "agent"
    password?: string
    privateKeyPath?: string
    passphrase?: string
}

/**
 * SSL/TLS configuration
 */
export interface SSLConfig {
    enabled: boolean
    rejectUnauthorized: boolean
    caPath?: string
    certPath?: string
    keyPath?: string
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
    username?: string
    password?: string
    authDatabase?: string // MongoDB specific
    authMechanism?: string
}

/**
 * Connection configuration for a database
 */
export interface ConnectionConfig {
    type: DatabaseType
    name: string
    host: string
    port: number
    auth?: AuthConfig
    ssh?: SSHConfig
    ssl?: SSLConfig
    connectionString?: string
    options?: Record<string, unknown>
}

/**
 * Create a default connection config for a database type.
 *
 * Defaults pulled from `domain/constants/database-defaults` — magic numbers
 * (27017, 6379) and "admin" used to live inline; centralising them keeps
 * Rust and TS in sync via the shared CLAUDE.md convention.
 */
export function createDefaultConnectionConfig(type: DatabaseType): ConnectionConfig {
    const defaults: Record<DatabaseType, Partial<ConnectionConfig>> = {
        [DatabaseType.MongoDB]: {
            host: DEFAULT_HOST,
            port: DEFAULT_PORTS[DatabaseType.MongoDB],
            auth: {
                authDatabase: DEFAULT_MONGO_AUTH_DATABASE,
            },
        },
        [DatabaseType.Redis]: {
            host: DEFAULT_HOST,
            port: DEFAULT_PORTS[DatabaseType.Redis],
        },
    }

    return {
        type,
        name: "",
        host: defaults[type].host ?? DEFAULT_HOST,
        port: defaults[type].port ?? DEFAULT_PORTS[type],
        ...defaults[type],
    }
}

/**
 * Build the connection URI for a config and wrap it in a `ConnectionString`
 * value object. The wrapper redacts the password on `toString()` /
 * `toJSON()` and only exposes the plaintext URI through an explicit
 * `.reveal()` call, so a careless `logger.info("config", { uri })` can no
 * longer leak credentials into a logging pipeline.
 *
 * Drivers / adapters that actually need to dial the server should call
 * `.reveal()` at the connect site and nowhere else — the call sites
 * stay small, greppable, and auditable.
 */
export function buildConnectionString(config: ConnectionConfig): ConnectionString {
    return ConnectionString.from(buildRawConnectionString(config))
}

/**
 * The plaintext URI builder. Kept as a separate internal function so
 * `ConnectionString.from(buildRawConnectionString(...))` stays the only
 * place credentials get string-concatenated. Tests call this directly
 * to assert URI shape; production code should always go through
 * `buildConnectionString`.
 */
function buildRawConnectionString(config: ConnectionConfig): string {
    if (config.connectionString) {
        return config.connectionString
    }

    switch (config.type) {
        case DatabaseType.MongoDB:
            return buildMongoUri(config)
        case DatabaseType.Redis:
            return buildRedisUri(config)
        default:
            // Exhaustive switch: hitting this branch means a new
            // `DatabaseType` was added but its URI shape wasn't. We want
            // that to fail at compile time, not at runtime — the
            // `: never` annotation forces a TS error on the typed branch
            // and the runtime throw covers the cast-from-unknown case.
            return assertNever(config.type, `Unsupported database type: ${String(config.type)}`)
    }
}

function buildMongoUri(config: ConnectionConfig): string {
    let uri = "mongodb://"
    if (config.auth?.username && config.auth?.password) {
        uri += `${encodeURIComponent(config.auth.username)}:${encodeURIComponent(config.auth.password)}@`
    }
    uri += `${config.host}:${config.port}`
    if (config.auth?.authDatabase) {
        uri += `/${config.auth.authDatabase}`
    }
    // Honour the SSL toggle so a TLS-enabled config produces a URI the
    // driver actually connects securely with. Previously the flag lived
    // in the model and was silently ignored here, which meant the only
    // way to enable TLS was via the raw `connectionString` override —
    // surprising and easy to forget.
    if (config.ssl?.enabled) {
        uri += `${config.auth?.authDatabase ? "" : "/"}?tls=true`
    }
    return uri
}

function buildRedisUri(config: ConnectionConfig): string {
    // `rediss://` is the wire-level signal for TLS; `redis://` is
    // plaintext. Same problem as MongoDB — the SSL toggle wasn't
    // reflected in the URI, so it might as well not have existed for
    // everyone using the GUI builder.
    const scheme = config.ssl?.enabled ? "rediss" : "redis"
    let uri = `${scheme}://`
    if (config.auth?.password) {
        uri += `:${encodeURIComponent(config.auth.password)}@`
    }
    uri += `${config.host}:${config.port}`
    return uri
}

function assertNever(_value: never, message: string): never {
    throw new Error(message)
}
