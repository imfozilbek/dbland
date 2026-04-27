import {
    DEFAULT_HOST,
    DEFAULT_MONGO_AUTH_DATABASE,
    DEFAULT_PORTS,
} from "../constants/database-defaults"
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
 * Build a connection string from config
 */
export function buildConnectionString(config: ConnectionConfig): string {
    if (config.connectionString) {
        return config.connectionString
    }

    switch (config.type) {
        case DatabaseType.MongoDB: {
            let uri = "mongodb://"
            if (config.auth?.username && config.auth?.password) {
                uri += `${encodeURIComponent(config.auth.username)}:${encodeURIComponent(config.auth.password)}@`
            }
            uri += `${config.host}:${config.port}`
            if (config.auth?.authDatabase) {
                uri += `/${config.auth.authDatabase}`
            }
            return uri
        }
        case DatabaseType.Redis: {
            let uri = "redis://"
            if (config.auth?.password) {
                uri += `:${config.auth.password}@`
            }
            uri += `${config.host}:${config.port}`
            return uri
        }
        default:
            throw new Error(`Unsupported database type: ${String(config.type)}`)
    }
}
