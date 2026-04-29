import { useEffect, useState } from "react"
import { usePlatform } from "../contexts/PlatformContext"
import { useConnectionStore } from "../stores/connection-store"
import { useSchemaStore } from "../stores/schema-store"
import { useQueryStore } from "../stores/query-store"

/**
 * Hook that initializes stores with platform API.
 * Call this once at the app root level.
 *
 * The first hookup runs *synchronously* on the very first render via
 * a `useState` lazy initialiser. The previous version did the same
 * inside `useEffect`, which ran after child useEffects — so a
 * `<Sidebar />` mounted underneath fired its own `loadConnections`
 * effect *first*, saw no `_api` on the store, returned silently, and
 * the connection list stayed empty until the user triggered a
 * refresh manually. Putting the wire-up in the synchronous render
 * path means children that consume the stores during their first
 * effect already see a configured API.
 *
 * The follow-up `useEffect` keeps the stores in sync if the platform
 * api ever changes (rare — it's a module-level singleton — but
 * preserves the original contract).
 */
export function usePlatformInit(): void {
    const api = usePlatform()

    useState(() => {
        useConnectionStore.getState().setApi(api)
        useSchemaStore.getState().setApi(api)
        useQueryStore.getState().setApi(api)
        return null
    })

    useEffect(() => {
        useConnectionStore.getState().setApi(api)
        useSchemaStore.getState().setApi(api)
        useQueryStore.getState().setApi(api)
    }, [api])
}
