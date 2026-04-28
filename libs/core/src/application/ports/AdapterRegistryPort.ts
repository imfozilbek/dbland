import { Connection } from "../../domain/entities/Connection"
import { DatabaseAdapterPort } from "./DatabaseAdapterPort"

/**
 * Owns the lifecycle of database adapters keyed by `connectionId`. The
 * three existing use cases used to take hand-rolled lambdas
 * (`adapterFactory: (connection) => DatabaseAdapterPort` for connect,
 * `getAdapter: (id) => DatabaseAdapterPort | undefined` for execute /
 * schema). That worked but left the answer to "when is an adapter
 * destroyed?" undefined and forced every test to fake it differently.
 *
 * Concentrating it behind a port:
 *   - `register` creates and stores the adapter the first time a
 *     connection is opened,
 *   - `get` returns it for queries / schema fetches without rebuilding,
 *   - `release` tears it down on disconnect or on app shutdown,
 *   - `has` is a non-allocating existence check used by guards.
 *
 * The infrastructure implementation owns the `Map<connectionId,
 * DatabaseAdapterPort>` and is the only place lifetime semantics live.
 * Use cases stay pure — they neither construct adapters nor decide when
 * to free them.
 *
 * Why not just expose a `Map`: a port lets us swap implementations for
 * tests (a deterministic `FakeAdapterRegistry`) and lets the production
 * implementation add cross-cutting concerns later — connection pooling,
 * idle-timeout reaping, instrumentation — without touching use cases.
 */
export interface AdapterRegistryPort {
    /**
     * Register an adapter for the given connection. The implementation
     * decides whether re-registering an already-known connection
     * replaces or rejects; the contract here is "after this resolves,
     * `get(connection.id)` returns this adapter."
     */
    register(connection: Connection, adapter: DatabaseAdapterPort): Promise<void>

    /**
     * Look up the active adapter for a connection. Returns `undefined`
     * if no adapter is registered (the connection was never opened, or
     * was already released).
     */
    get(connectionId: string): DatabaseAdapterPort | undefined

    /**
     * Existence probe. Equivalent to `get(id) !== undefined` but
     * implementations may make it cheaper if a registry grows large.
     */
    has(connectionId: string): boolean

    /**
     * Tear down and remove the adapter for `connectionId`. Resolves
     * once the adapter's own teardown (`adapter.disconnect()` or
     * equivalent) has completed. No-op if the connection wasn't
     * registered. After resolution, `get` returns `undefined`.
     */
    release(connectionId: string): Promise<void>

    /**
     * Tear down every registered adapter. Used at app shutdown so
     * connections aren't leaked across process exit.
     */
    releaseAll(): Promise<void>
}
