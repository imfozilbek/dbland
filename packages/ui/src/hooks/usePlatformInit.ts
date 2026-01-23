import { useEffect } from "react"
import { usePlatform } from "../contexts/PlatformContext"
import { useConnectionStore } from "../stores/connection-store"
import { useSchemaStore } from "../stores/schema-store"
import { useQueryStore } from "../stores/query-store"

/**
 * Hook that initializes stores with platform API.
 * Call this once at the app root level.
 */
export function usePlatformInit(): void {
    const api = usePlatform()

    useEffect(() => {
        useConnectionStore.getState().setApi(api)
        useSchemaStore.getState().setApi(api)
        useQueryStore.getState().setApi(api)
    }, [api])
}
