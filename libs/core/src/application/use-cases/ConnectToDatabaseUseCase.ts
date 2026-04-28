import {
    Connection,
    ConnectionStatus,
    updateConnectionStatus,
} from "../../domain/entities/Connection"
import {
    ConnectionEstablishedEvent,
    ConnectionFailedEvent,
    ConnectionStatusChangedEvent,
    createConnectionEstablishedEvent,
    createConnectionFailedEvent,
    createConnectionStatusChangedEvent,
} from "../../domain/events/ConnectionEvents"
import { DatabaseAdapterPort } from "../ports/DatabaseAdapterPort"
import { ConnectionStoragePort } from "../ports/ConnectionStoragePort"
import { LoggerPort, NoopLogger } from "../ports/LoggerPort"

/**
 * Connect to database use case input
 */
export interface ConnectToDatabaseInput {
    connectionId: string
}

/**
 * Connect to database use case output
 */
export interface ConnectToDatabaseOutput {
    success: boolean
    connection?: Connection
    error?: string
    events: (ConnectionEstablishedEvent | ConnectionFailedEvent | ConnectionStatusChangedEvent)[]
}

/**
 * Connect to database use case
 */
export class ConnectToDatabaseUseCase {
    private readonly logger: LoggerPort

    constructor(
        private readonly storage: ConnectionStoragePort,
        private readonly adapterFactory: (connection: Connection) => DatabaseAdapterPort,
        logger?: LoggerPort,
    ) {
        // Defaults to a no-op so existing call sites (and 73+ unit tests)
        // don't have to construct a logger they don't care about.
        this.logger = logger?.child?.({ useCase: "ConnectToDatabase" }) ?? NoopLogger
    }

    async execute(input: ConnectToDatabaseInput): Promise<ConnectToDatabaseOutput> {
        const events: (
            | ConnectionEstablishedEvent
            | ConnectionFailedEvent
            | ConnectionStatusChangedEvent
        )[] = []

        // Get connection from storage
        const connection = await this.storage.getConnection(input.connectionId)
        if (!connection) {
            this.logger.warn("Connection not found", { connectionId: input.connectionId })
            return {
                success: false,
                error: `Connection not found: ${input.connectionId}`,
                events,
            }
        }

        this.logger.info("Connecting", {
            connectionId: connection.id,
            type: connection.config.type,
            host: connection.config.host,
        })

        // Update status to connecting
        const previousStatus = connection.status
        let updatedConnection = updateConnectionStatus(connection, ConnectionStatus.Connecting)
        events.push(
            createConnectionStatusChangedEvent(
                connection.id,
                previousStatus,
                ConnectionStatus.Connecting,
            ),
        )

        // Get adapter for this connection type
        const adapter = this.adapterFactory(connection)

        try {
            // Get decrypted credentials if needed
            const credentials = await this.storage.getCredentials(connection.id)

            // Route each secret to the slot that needs it. Database auth and
            // SSH-tunnel auth are independent, and the previous version
            // copied `credentials.password` into both — so when a user set
            // only one of the two, the other field silently received a
            // mismatched secret. The legacy single `password` field stays
            // as a transition-window fallback for storage adapters that
            // haven't been updated yet, but the explicit `authPassword` /
            // `sshPassword` always win when present.
            const authPassword =
                credentials?.authPassword ??
                credentials?.password ??
                connection.config.auth?.password
            const sshPassword = credentials?.sshPassword ?? connection.config.ssh?.password

            const config = {
                ...connection.config,
                auth: {
                    ...connection.config.auth,
                    password: authPassword,
                },
                ssh: connection.config.ssh
                    ? {
                          ...connection.config.ssh,
                          password: sshPassword,
                          privateKeyPath: undefined,
                      }
                    : undefined,
            }

            // Connect
            await adapter.connect(config)

            // Update status to connected
            updatedConnection = updateConnectionStatus(
                updatedConnection,
                ConnectionStatus.Connected,
            )
            await this.storage.updateConnection(connection.id, {
                status: ConnectionStatus.Connected,
                lastConnectedAt: new Date(),
            })

            events.push(createConnectionEstablishedEvent(updatedConnection))

            this.logger.info("Connected", { connectionId: connection.id })

            return {
                success: true,
                connection: updatedConnection,
                events,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            this.logger.error("Connect failed", error, { connectionId: connection.id })

            // Update status to error
            updatedConnection = updateConnectionStatus(updatedConnection, ConnectionStatus.Error)
            await this.storage.updateConnection(connection.id, {
                status: ConnectionStatus.Error,
            })

            events.push(createConnectionFailedEvent(connection.id, errorMessage))

            return {
                success: false,
                connection: updatedConnection,
                error: errorMessage,
                events,
            }
        }
    }
}
