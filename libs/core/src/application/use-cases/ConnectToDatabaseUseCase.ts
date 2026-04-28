import {
    canTransitionTo,
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
import { ConnectionError } from "../../domain/errors/ConnectionError"
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

    /**
     * Pull decrypted credentials from storage and route each one to the
     * slot that needs it. Database auth and SSH-tunnel auth are
     * independent, and the previous version copied `credentials.password`
     * into both — so when a user set only one of the two, the other
     * field silently received a mismatched secret. The legacy single
     * `password` field stays as a transition-window fallback for storage
     * adapters that haven't been updated yet, but the explicit
     * `authPassword` / `sshPassword` always win when present.
     *
     * Extracted out of `execute` so that method stays under the 100-line
     * cap and reads as the high-level state-machine driver it is.
     */
    private async resolveAdapterConfig(connection: Connection): Promise<Connection["config"]> {
        const credentials = await this.storage.getCredentials(connection.id)

        const authPassword =
            credentials?.authPassword ?? credentials?.password ?? connection.config.auth?.password
        const sshPassword = credentials?.sshPassword ?? connection.config.ssh?.password

        return {
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

        // Already connected — return idempotently rather than re-running
        // the handshake. Re-running would orphan the existing driver
        // pool and SSH tunnel under whatever stale registry entry we
        // had, so the only safe shortcut is to do nothing.
        if (connection.status === ConnectionStatus.Connected) {
            this.logger.info("Already connected — idempotent return", {
                connectionId: connection.id,
            })
            return { success: true, connection, events }
        }

        // Reject illegal lifecycle transitions before we touch the
        // adapter. The state machine forbids `Connecting → Connecting`
        // (request already in flight) and any other path that doesn't
        // start from a settled state — landing here means the UI
        // double-fired or a stored record is out of sync with reality.
        if (!canTransitionTo(connection.status, ConnectionStatus.Connecting)) {
            const err = ConnectionError.invalidTransition(
                connection.id,
                connection.status,
                ConnectionStatus.Connecting,
            )
            this.logger.warn("Invalid lifecycle transition", {
                connectionId: connection.id,
                from: connection.status,
                to: ConnectionStatus.Connecting,
            })
            return { success: false, error: err.message, events }
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
            const config = await this.resolveAdapterConfig(connection)
            await adapter.connect(config)

            // Update status to connected. One atomic write — previously
            // the use case wrote the "connecting" state and the success
            // state in two separate `updateConnection` calls, leaving a
            // window where a crash mid-transition persisted state that
            // disagreed with what the in-memory aggregate would replay.
            updatedConnection = updateConnectionStatus(
                updatedConnection,
                ConnectionStatus.Connected,
            )
            await this.storage.persistConnectionTransition(connection.id, {
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

            // Update status to error — atomic write so the persisted
            // status and the failure reason land together.
            updatedConnection = updateConnectionStatus(updatedConnection, ConnectionStatus.Error)
            await this.storage.persistConnectionTransition(connection.id, {
                status: ConnectionStatus.Error,
                error: errorMessage,
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
