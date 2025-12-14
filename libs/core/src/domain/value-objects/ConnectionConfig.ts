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
 * Create a default connection config for a database type
 */
export function createDefaultConnectionConfig(type: DatabaseType): ConnectionConfig {
    const defaults: Record<DatabaseType, Partial<ConnectionConfig>> = {
        [DatabaseType.MongoDB]: {
            host: "localhost",
            port: 27017,
            auth: {
                authDatabase: "admin",
            },
        },
        [DatabaseType.Redis]: {
            host: "localhost",
            port: 6379,
        },
    }

    return {
        type,
        name: "",
        host: defaults[type].host ?? "localhost",
        port: defaults[type].port ?? 27017,
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
