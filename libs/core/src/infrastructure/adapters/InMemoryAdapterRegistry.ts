import { Connection } from "../../domain/entities/Connection"
import { AdapterRegistryPort } from "../../application/ports/AdapterRegistryPort"
import { DatabaseAdapterPort } from "../../application/ports/DatabaseAdapterPort"
import { LoggerPort, NoopLogger } from "../../application/ports/LoggerPort"

/**
 * Default `AdapterRegistryPort` for in-process use — desktop app's main
 * thread, web app, and unit tests all share this implementation. Maps
 * `connectionId` → live `DatabaseAdapterPort`, and routes `release` and
 * `releaseAll` through the adapter's own `disconnect()` so the
 * server-side handle is closed before the entry leaves the map.
 *
 * Multi-process scenarios (Electron worker, web-worker pool, etc.) need
 * a different implementation that synchronises across the boundary;
 * keeping that out of scope here means the in-memory case stays trivial
 * and correct.
 *
 * Optionally takes a `LoggerPort` so adapter-side teardown failures are
 * visible. Without this, a stuck disconnect at app-shutdown would
 * silently never reach any sink — the only sign would be a hang in the
 * driver's connection table on the server.
 */
export class InMemoryAdapterRegistry implements AdapterRegistryPort {
    private readonly adapters = new Map<string, DatabaseAdapterPort>()
    private readonly logger: LoggerPort

    constructor(logger?: LoggerPort) {
        this.logger = logger?.child?.({ component: "AdapterRegistry" }) ?? NoopLogger
    }

    async register(connection: Connection, adapter: DatabaseAdapterPort): Promise<void> {
        // If the same connectionId is being re-registered (e.g. user
        // disconnected and reconnected without us seeing the disconnect),
        // close the previous adapter before swapping. Without this we'd
        // leak the old server handle.
        const previous = this.adapters.get(connection.id)
        if (previous && previous !== adapter) {
            await this.safeDisconnect(previous, connection.id, "register-replace")
        }
        this.adapters.set(connection.id, adapter)
    }

    get(connectionId: string): DatabaseAdapterPort | undefined {
        return this.adapters.get(connectionId)
    }

    has(connectionId: string): boolean {
        return this.adapters.has(connectionId)
    }

    async release(connectionId: string): Promise<void> {
        const adapter = this.adapters.get(connectionId)
        if (!adapter) {
            return
        }
        // Drop the entry first so a concurrent `get()` can't observe a
        // half-disconnected adapter mid-`release()`.
        this.adapters.delete(connectionId)
        await this.safeDisconnect(adapter, connectionId, "release")
    }

    async releaseAll(): Promise<void> {
        const entries = Array.from(this.adapters.entries())
        this.adapters.clear()
        // Tear down in parallel — they're independent server handles, no
        // need to serialise. `Promise.allSettled` so one stuck disconnect
        // doesn't block the rest from cleaning up at app shutdown.
        await Promise.allSettled(
            entries.map(async ([id, a]) => this.safeDisconnect(a, id, "releaseAll")),
        )
    }

    /**
     * Wrap `adapter.disconnect()` so an exception inside one adapter's
     * teardown doesn't leak through `release()` — but log it on the way
     * out. The registry's job is to forget the entry; the logger gives
     * the caller a chance to notice that a server-side handle wasn't
     * closed cleanly.
     */
    private async safeDisconnect(
        adapter: DatabaseAdapterPort,
        connectionId: string,
        scope: string,
    ): Promise<void> {
        try {
            await adapter.disconnect()
        } catch (error) {
            this.logger.warn("Adapter disconnect failed", { connectionId, scope, error })
        }
    }
}
