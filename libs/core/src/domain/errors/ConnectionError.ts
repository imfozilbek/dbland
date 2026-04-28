import { DomainError, ErrorCode } from "./DomainError"

/**
 * Anything that goes wrong while *establishing*, *holding open*, or
 * *tearing down* a database connection. Query-time failures belong in
 * `QueryError`; persisting connection metadata belongs in `StorageError`.
 *
 * The constructor takes an explicit code rather than defaulting it because
 * the recovery action (retry vs prompt for credentials vs open the
 * connection editor) hinges on it — we want every call site to make that
 * choice consciously.
 */
export class ConnectionError extends DomainError {
    readonly code:
        | typeof ErrorCode.CONNECTION_NOT_FOUND
        | typeof ErrorCode.CONNECTION_ALREADY_CONNECTED
        | typeof ErrorCode.CONNECTION_INVALID_TRANSITION
        | typeof ErrorCode.CONNECTION_REFUSED
        | typeof ErrorCode.CONNECTION_TIMEOUT
        | typeof ErrorCode.AUTH_FAILED

    constructor(code: ConnectionError["code"], message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.code = code
    }

    static notFound(connectionId: string, options?: { cause?: unknown }): ConnectionError {
        return new ConnectionError(
            ErrorCode.CONNECTION_NOT_FOUND,
            `Connection ${connectionId} not found`,
            options,
        )
    }

    static alreadyConnected(connectionId: string): ConnectionError {
        return new ConnectionError(
            ErrorCode.CONNECTION_ALREADY_CONNECTED,
            `Connection ${connectionId} is already connected`,
        )
    }

    static refused(connectionId: string, cause?: unknown): ConnectionError {
        return new ConnectionError(
            ErrorCode.CONNECTION_REFUSED,
            `Connection ${connectionId} refused by server`,
            { cause },
        )
    }

    static timeout(connectionId: string, cause?: unknown): ConnectionError {
        return new ConnectionError(
            ErrorCode.CONNECTION_TIMEOUT,
            `Connection ${connectionId} timed out`,
            { cause },
        )
    }

    static authFailed(connectionId: string, cause?: unknown): ConnectionError {
        return new ConnectionError(
            ErrorCode.AUTH_FAILED,
            `Authentication failed for connection ${connectionId}`,
            { cause },
        )
    }

    /**
     * Raised when a use case tries to drive a connection from one
     * lifecycle state to another that the state machine forbids — e.g.
     * `Connected → Connecting` (must `Disconnected` first) or
     * `Connecting → Connecting` (a request is already in flight). The UI
     * normally prevents these by disabling the offending button, so
     * landing here points at a race condition or a programmer error
     * rather than user input we can recover from.
     */
    static invalidTransition(connectionId: string, from: string, to: string): ConnectionError {
        return new ConnectionError(
            ErrorCode.CONNECTION_INVALID_TRANSITION,
            `Connection ${connectionId} cannot transition from ${from} to ${to}`,
        )
    }
}
