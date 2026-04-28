import { Connection } from "../../domain/entities/Connection"
import { AdapterRegistryPort } from "../../application/ports/AdapterRegistryPort"
import { DatabaseAdapterPort } from "../../application/ports/DatabaseAdapterPort"

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
 */
export class InMemoryAdapterRegistry implements AdapterRegistryPort {
    private readonly adapters = new Map<string, DatabaseAdapterPort>()

    async register(connection: Connection, adapter: DatabaseAdapterPort): Promise<void> {
        // If the same connectionId is being re-registered (e.g. user
        // disconnected and reconnected without us seeing the disconnect),
        // close the previous adapter before swapping. Without this we'd
        // leak the old server handle.
        const previous = this.adapters.get(connection.id)
        if (previous && previous !== adapter) {
            await safeDisconnect(previous)
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
        await safeDisconnect(adapter)
    }

    async releaseAll(): Promise<void> {
        const entries = Array.from(this.adapters.values())
        this.adapters.clear()
        // Tear down in parallel — they're independent server handles, no
        // need to serialise. `Promise.allSettled` so one stuck disconnect
        // doesn't block the rest from cleaning up at app shutdown.
        await Promise.allSettled(entries.map(async (a) => safeDisconnect(a)))
    }
}

/**
 * Wrap `adapter.disconnect()` so an exception inside one adapter's
 * teardown doesn't leak through `release()`. The registry's job is to
 * forget the entry; logging belongs in a higher layer.
 */
async function safeDisconnect(adapter: DatabaseAdapterPort): Promise<void> {
    try {
        await adapter.disconnect()
    } catch {
        // Intentionally swallowed — see jsdoc above. Higher layers
        // (a logger wrapped around the registry, an observability
        // adapter) can re-add visibility without changing the
        // semantics here.
    }
}
