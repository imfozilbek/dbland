import { useCallback, useState } from "react"
import { Database, HardDrive, Table2 } from "lucide-react"
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
                    } catch {
                        // Error is handled in store
                    }
                } else if (isConnected && databases.length === 0) {
                    // Already connected but no databases loaded
                    try {
                        await loadDatabases(connection.id)
                    } catch {
                        // Error is handled in store
                    }
                }
            }
        },
        [connection.id, isConnected, isConnecting, databases.length, connect, loadDatabases],
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
                } catch {
                    // Error is handled in store
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

    // Get connection icon color
    const getTypeColor = (): string => {
        return connection.type === "mongodb" ? "text-[#00ed64]" : "text-[#dc382d]"
    }

    // Get status indicator
    const getStatusIndicator = (): JSX.Element => {
        const statusColors: Record<Connection["status"], string> = {
            connected: "bg-green-500",
            connecting: "bg-yellow-500 animate-pulse",
            error: "bg-red-500",
            disconnected: "bg-gray-400",
        }

        return (
            <span className={cn("ml-auto h-2 w-2 rounded-full", statusColors[connection.status])} />
        )
    }

    return (
        <Tree>
            <TreeGroup
                icon={<Database className={cn("h-3.5 w-3.5", getTypeColor())} />}
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
                {isConnecting && <TreeEmpty level={1}>Connecting...</TreeEmpty>}

                {/* Error state */}
                {connection.status === "error" && (
                    <TreeEmpty level={1}>Connection failed</TreeEmpty>
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
                    databases.map((db) => (
                        <DatabaseNode
                            key={db.name}
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
            {collections.map((coll) => (
                <TreeItem
                    key={coll.name}
                    icon={<Table2 className="h-3.5 w-3.5 text-muted-foreground" />}
                    label={coll.name}
                    badge={coll.documentCount}
                    level={2}
                    onClick={() => {
                        onCollectionClick(coll.name)
                    }}
                />
            ))}
        </TreeGroup>
    )
}
