import { Connection, ConnectionStatus, markDisconnected } from "../../domain/entities/Connection"
import {
    ConnectionFailedEvent,
    ConnectionStatusChangedEvent,
    createConnectionStatusChangedEvent,
} from "../../domain/events/ConnectionEvents"
import { ConnectionError } from "../../domain/errors/ConnectionError"
import { AdapterRegistryPort } from "../ports/AdapterRegistryPort"
import { ConnectionStoragePort } from "../ports/ConnectionStoragePort"
import { LoggerPort, NoopLogger } from "../ports/LoggerPort"

export interface DisconnectFromDatabaseInput {
    connectionId: string
}

export interface DisconnectFromDatabaseOutput {
    success: boolean
    connection?: Connection
    error?: string
    events: (ConnectionStatusChangedEvent | ConnectionFailedEvent)[]
}

/**
 * Tear down an active connection's session and persist the new state.
 * Symmetric counterpart to `ConnectToDatabaseUseCase`. The two used to
 * be asymmetric — connect was a use case, disconnect was inline glue
 * scattered across a Tauri command and a Zustand action — which made
 * the lifecycle hard to reason about and impossible to test as a unit.
 *
 * Order matters here. Concretely:
 *
 *   1. Look up the connection from storage. If it's missing, refuse
 *      with `ConnectionError.notFound` rather than silently no-op'ing
 *      (the caller's mental model says "I had a record"; the storage
 *      says otherwise — that's a real divergence).
 *   2. Release the adapter from the registry. This calls the
 *      adapter's own `disconnect()` — closing the driver pool and any
 *      SSH tunnel. We do this *before* the persistence step so that if
 *      the disconnect throws, we still write the new "Disconnected"
 *      status: the local intent is to be disconnected, regardless of
 *      whether the server-side teardown was clean.
 *   3. Persist the status transition atomically. Single
 *      `persistConnectionTransition` write, same shape as connect's
 *      success path — guarantees the persisted record can never report
 *      a status that disagrees with the absence of an adapter.
 *   4. Emit a `connection.status_changed` event so the UI / event log
 *      sees the transition.
 */
export class DisconnectFromDatabaseUseCase {
    private readonly logger: LoggerPort

    constructor(
        private readonly storage: ConnectionStoragePort,
        private readonly registry: AdapterRegistryPort,
        logger?: LoggerPort,
    ) {
        this.logger = logger?.child?.({ useCase: "DisconnectFromDatabase" }) ?? NoopLogger
    }

    async execute(input: DisconnectFromDatabaseInput): Promise<DisconnectFromDatabaseOutput> {
        const events: (ConnectionStatusChangedEvent | ConnectionFailedEvent)[] = []

        const connection = await this.storage.getConnection(input.connectionId)
        if (!connection) {
            this.logger.warn("Disconnect requested for missing connection", {
                connectionId: input.connectionId,
            })
            const err = ConnectionError.notFound(input.connectionId)
            return {
                success: false,
                error: err.message,
                events,
            }
        }

        const previousStatus = connection.status
        this.logger.info("Disconnecting", {
            connectionId: connection.id,
            previousStatus,
        })

        // Step 2: tear down the live driver / SSH tunnel. The registry
        // implementation already swallows adapter-side disconnect
        // errors (the local intent is to be disconnected regardless),
        // so this won't throw.
        await this.registry.release(connection.id)

        // Step 3: persist atomically.
        await this.storage.persistConnectionTransition(connection.id, {
            status: ConnectionStatus.Disconnected,
        })

        const updated = markDisconnected(connection)
        events.push(
            createConnectionStatusChangedEvent(
                connection.id,
                previousStatus,
                ConnectionStatus.Disconnected,
            ),
        )

        this.logger.info("Disconnected", { connectionId: connection.id })

        return {
            success: true,
            connection: updated,
            events,
        }
    }
}
