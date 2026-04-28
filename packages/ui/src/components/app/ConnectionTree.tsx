import { useCallback, useState } from "react"
import { Database, HardDrive, Table2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "../../lib/utils"
import { Tree, TreeEmpty, TreeGroup, TreeItem } from "../ui/tree"
import { type Connection, useConnectionStore } from "../../stores/connection-store"
import {
    type DatabaseInfo,
    selectCollections,
    selectDatabases,
    useSchemaStore,
} from "../../stores/schema-store"

export interface ConnectionTreeProps {
    connection: Connection
    isActive: boolean
    onConnectionSelect?: (connectionId: string) => void
    onCollectionSelect?: (connectionId: string, database: string, collection: string) => void
}

export function ConnectionTree({
    connection,
    isActive,
    onConnectionSelect,
    onCollectionSelect,
}: ConnectionTreeProps): JSX.Element {
    const [isOpen, setIsOpen] = useState(false)
    const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set())

    // Connection store
    const { connect } = useConnectionStore()

    // Schema store
    const { loadDatabases, loadCollections, isLoading: schemaLoading } = useSchemaStore()
    const databases = useSchemaStore(selectDatabases(connection.id))

    const isConnected = connection.status === "connected"
    const isConnecting = connection.status === "connecting"

    // Handle connection expand
    const handleConnectionOpenChange = useCallback(
        async (open: boolean): Promise<void> => {
            setIsOpen(open)

            if (open) {
                // Connect if not connected
                if (!isConnected && !isConnecting) {
                    try {
                        await connect(connection.id)
                        await loadDatabases(connection.id)
                    } catch (err: unknown) {
                        // Store mutates connection.status → "error" so the dot
                        // turns red, but the user also needs to know *why* —
                        // surface the error message as a toast.
                        toast.error(`Couldn't connect to ${connection.name}`, {
                            description: err instanceof Error ? err.message : String(err),
                        })
                    }
                } else if (isConnected && databases.length === 0) {
                    // Already connected but no databases loaded
                    try {
                        await loadDatabases(connection.id)
                    } catch (err: unknown) {
                        toast.error(`Couldn't load databases for ${connection.name}`, {
                            description: err instanceof Error ? err.message : String(err),
                        })
                    }
                }
            }
        },
        [
            connection.id,
            connection.name,
            isConnected,
            isConnecting,
            databases.length,
            connect,
            loadDatabases,
        ],
    )

    // Handle database expand
    const handleDatabaseOpenChange = useCallback(
        async (dbName: string, open: boolean): Promise<void> => {
            const newExpanded = new Set(expandedDatabases)
            if (open) {
                newExpanded.add(dbName)
                // Load collections if not loaded
                try {
                    await loadCollections(connection.id, dbName)
                } catch (err: unknown) {
                    toast.error(`Couldn't load collections for ${dbName}`, {
                        description: err instanceof Error ? err.message : String(err),
                    })
                }
            } else {
                newExpanded.delete(dbName)
            }
            setExpandedDatabases(newExpanded)
        },
        [connection.id, expandedDatabases, loadCollections],
    )

    // Handle collection click
    const handleCollectionClick = useCallback(
        (dbName: string, collectionName: string): void => {
            onCollectionSelect?.(connection.id, dbName, collectionName)
        },
        [connection.id, onCollectionSelect],
    )

    // Handle connection label click
    const handleConnectionLabelClick = useCallback((): void => {
        onConnectionSelect?.(connection.id)
    }, [connection.id, onConnectionSelect])

    // Get connection icon with database type color
    const getTypeIcon = (): JSX.Element => {
        const colorClass = connection.type === "mongodb" ? "text-mongodb" : "text-redis"
        return <Database className={cn("h-3.5 w-3.5", colorClass)} />
    }

    // Get status indicator with brand colors
    const getStatusIndicator = (): JSX.Element => {
        const statusStyles: Record<Connection["status"], string> = {
            connected: "bg-[var(--success)] shadow-[0_0_6px_var(--success)]",
            connecting: "bg-[var(--warning)] animate-pulse",
            error: "bg-[var(--destructive)]",
            disconnected: "bg-muted-foreground/60",
        }

        const statusLabel: Record<Connection["status"], string> = {
            connected: "Connected",
            connecting: "Connecting",
            error: "Connection error",
            disconnected: "Disconnected",
        }

        return (
            <span
                role="status"
                aria-label={statusLabel[connection.status]}
                className={cn(
                    "ml-auto h-2 w-2 rounded-full transition-colors",
                    statusStyles[connection.status],
                )}
            />
        )
    }

    return (
        <Tree>
            <TreeGroup
                icon={getTypeIcon()}
                label={connection.name}
                statusIndicator={getStatusIndicator()}
                open={isOpen}
                isLoading={isConnecting}
                isActive={isActive}
                level={0}
                onOpenChange={(open) => {
                    void handleConnectionOpenChange(open)
                }}
                onLabelClick={handleConnectionLabelClick}
            >
                {/* Loading state */}
                {isConnecting && <TreeEmpty level={1}>Connecting…</TreeEmpty>}

                {/* Error state */}
                {connection.status === "error" && (
                    <TreeEmpty level={1}>
                        <span className="text-destructive">Connection failed</span>
                    </TreeEmpty>
                )}

                {/* Connected but loading databases */}
                {isConnected && schemaLoading && databases.length === 0 && (
                    <TreeEmpty level={1}>Loading databases...</TreeEmpty>
                )}

                {/* Connected with no databases */}
                {isConnected && !schemaLoading && databases.length === 0 && (
                    <TreeEmpty level={1}>No databases found</TreeEmpty>
                )}

                {/* Database list */}
                {isConnected &&
                    databases.map((db, index) => (
                        <div
                            key={db.name}
                            className="animate-fadeInUp"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <DatabaseNode
                                connectionId={connection.id}
                                database={db}
                                isExpanded={expandedDatabases.has(db.name)}
                                onOpenChange={(open) => {
                                    void handleDatabaseOpenChange(db.name, open)
                                }}
                                onCollectionClick={(collName) => {
                                    handleCollectionClick(db.name, collName)
                                }}
                            />
                        </div>
                    ))}
            </TreeGroup>
        </Tree>
    )
}

/* -----------------------------------------------------------------------------
 * DatabaseNode - Sub-component for database tree node
 * -------------------------------------------------------------------------- */

interface DatabaseNodeProps {
    connectionId: string
    database: DatabaseInfo
    isExpanded: boolean
    onOpenChange: (open: boolean) => void
    onCollectionClick: (collectionName: string) => void
}

function DatabaseNode({
    connectionId,
    database,
    isExpanded,
    onOpenChange,
    onCollectionClick,
}: DatabaseNodeProps): JSX.Element {
    const collections = useSchemaStore(selectCollections(connectionId, database.name))
    const { isLoading } = useSchemaStore()

    return (
        <TreeGroup
            icon={<HardDrive className="h-3.5 w-3.5 text-muted-foreground" />}
            label={database.name}
            badge={database.collectionCount}
            open={isExpanded}
            isLoading={isLoading && isExpanded && collections.length === 0}
            level={1}
            onOpenChange={onOpenChange}
        >
            {/* Loading state */}
            {isLoading && collections.length === 0 && (
                <TreeEmpty level={2}>Loading collections...</TreeEmpty>
            )}

            {/* No collections */}
            {!isLoading && collections.length === 0 && (
                <TreeEmpty level={2}>No collections</TreeEmpty>
            )}

            {/* Collection list */}
            {collections.map((coll, index) => (
                <div
                    key={coll.name}
                    className="animate-fadeInUp"
                    style={{ animationDelay: `${index * 20}ms` }}
                >
                    <TreeItem
                        icon={<Table2 className="h-3.5 w-3.5 text-muted-foreground" />}
                        label={coll.name}
                        badge={coll.documentCount}
                        level={2}
                        onClick={() => {
                            onCollectionClick(coll.name)
                        }}
                    />
                </div>
            ))}
        </TreeGroup>
    )
}
