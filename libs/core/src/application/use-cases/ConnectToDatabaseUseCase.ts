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
    constructor(
        private readonly storage: ConnectionStoragePort,
        private readonly adapterFactory: (connection: Connection) => DatabaseAdapterPort,
    ) {}

    async execute(input: ConnectToDatabaseInput): Promise<ConnectToDatabaseOutput> {
        const events: (
            | ConnectionEstablishedEvent
            | ConnectionFailedEvent
            | ConnectionStatusChangedEvent
        )[] = []

        // Get connection from storage
        const connection = await this.storage.getConnection(input.connectionId)
        if (!connection) {
            return {
                success: false,
                error: `Connection not found: ${input.connectionId}`,
                events,
            }
        }

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

            // Build config with decrypted credentials
            const config = {
                ...connection.config,
                auth: {
                    ...connection.config.auth,
                    password: credentials?.password ?? connection.config.auth?.password,
                },
                ssh: connection.config.ssh
                    ? {
                          ...connection.config.ssh,
                          password: credentials?.password ?? connection.config.ssh?.password,
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

            return {
                success: true,
                connection: updatedConnection,
                events,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

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
