import { useEffect, useState } from "react"
import { type DetailedCollectionStats, usePlatform } from "../../contexts/PlatformContext"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { BarChart, Database, RefreshCw } from "lucide-react"

export interface CollectionStatsProps {
    connectionId: string | null
    databaseName: string | null
    collectionName: string | null
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const
const BYTE_BASE = 1024

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return "0 B"
    }
    const i = Math.floor(Math.log(bytes) / Math.log(BYTE_BASE))
    return `${(bytes / Math.pow(BYTE_BASE, i)).toFixed(2)} ${BYTE_UNITS[i] ?? "TB"}`
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
    return (
        <Card className="p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
        </Card>
    )
}

function OverviewTab({ stats }: { stats: DetailedCollectionStats }): JSX.Element {
    return (
        <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Document Count" value={stats.count.toLocaleString()} />
                <StatCard label="Total Size" value={formatBytes(stats.size)} />
                <StatCard label="Avg Doc Size" value={formatBytes(stats.avgObjSize)} />
            </div>
            {stats.capped && <CappedCard stats={stats} />}
        </TabsContent>
    )
}

function CappedCard({ stats }: { stats: DetailedCollectionStats }): JSX.Element {
    return (
        <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
                <Badge variant="default">Capped Collection</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {stats.max && (
                    <div>
                        <div className="text-sm text-muted-foreground">Max Documents</div>
                        <div className="text-lg font-medium">{stats.max.toLocaleString()}</div>
                    </div>
                )}
                {stats.maxSize && (
                    <div>
                        <div className="text-sm text-muted-foreground">Max Size</div>
                        <div className="text-lg font-medium">{formatBytes(stats.maxSize)}</div>
                    </div>
                )}
            </div>
        </Card>
    )
}

function StorageTab({ stats }: { stats: DetailedCollectionStats }): JSX.Element {
    return (
        <TabsContent value="storage" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <StatCard label="Storage Size" value={formatBytes(stats.storageSize)} />
                <StatCard label="Index Size" value={formatBytes(stats.totalIndexSize)} />
                <StatCard label="Extents" value={String(stats.numExtents)} />
                {stats.numOrphanDocs !== undefined && (
                    <StatCard label="Orphan Docs" value={String(stats.numOrphanDocs)} />
                )}
            </div>
        </TabsContent>
    )
}

function IndexesTab({ stats }: { stats: DetailedCollectionStats }): JSX.Element {
    return (
        <TabsContent value="indexes" className="space-y-4">
            <div className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Index Sizes</h3>
                    <Badge variant="secondary">Total: {formatBytes(stats.totalIndexSize)}</Badge>
                </div>
                <div className="space-y-2">
                    {Object.entries(stats.indexSizes).map(([name, size]) => (
                        <div
                            key={name}
                            className="flex items-center justify-between rounded-md border p-3"
                        >
                            <div className="font-mono text-sm">{name}</div>
                            <Badge variant="outline">{formatBytes(size)}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>
    )
}

function ValidationTab({ stats }: { stats: DetailedCollectionStats }): JSX.Element {
    return (
        <TabsContent value="validation" className="space-y-4">
            <Card className="p-4">
                <h3 className="mb-4 font-semibold">Validation Rules</h3>
                <div className="space-y-3">
                    {stats.validationLevel && (
                        <div>
                            <div className="text-sm text-muted-foreground">Level</div>
                            <Badge variant="outline">{stats.validationLevel}</Badge>
                        </div>
                    )}
                    {stats.validationAction && (
                        <div>
                            <div className="text-sm text-muted-foreground">Action</div>
                            <Badge variant="outline">{stats.validationAction}</Badge>
                        </div>
                    )}
                </div>
            </Card>
        </TabsContent>
    )
}

function ShardingTab({ distribution }: { distribution: Record<string, number> }): JSX.Element {
    return (
        <TabsContent value="sharding" className="space-y-4">
            <Card className="p-4">
                <div className="mb-4 flex items-center gap-2">
                    <Badge variant="default">Sharded Collection</Badge>
                </div>
                <h3 className="mb-4 font-semibold">Shard Distribution</h3>
                <div className="space-y-2">
                    {Object.entries(distribution).map(([shard, count]) => (
                        <div
                            key={shard}
                            className="flex items-center justify-between rounded-md border p-3"
                        >
                            <div className="font-mono text-sm">{shard}</div>
                            <Badge variant="secondary">{count.toLocaleString()} chunks</Badge>
                        </div>
                    ))}
                </div>
            </Card>
        </TabsContent>
    )
}

interface StatsState {
    stats: DetailedCollectionStats | null
    isLoading: boolean
    error: string | null
}

interface UseCollectionStats extends StatsState {
    reload: () => void
}

/**
 * Pull the loading/error state out of the render component so the parent
 * doesn't have to count four early-return branches against its complexity
 * budget. Returns a `reload` callback that the Refresh button wires into.
 */
function useCollectionStats(
    connectionId: string | null,
    databaseName: string | null,
    collectionName: string | null,
): UseCollectionStats {
    const platform = usePlatform()
    const [state, setState] = useState<StatsState>({
        stats: null,
        isLoading: false,
        error: null,
    })

    const reload = (): void => {
        if (!connectionId || !databaseName || !collectionName) {
            return
        }

        setState({ stats: null, isLoading: true, error: null })
        platform
            .getDetailedCollectionStats(connectionId, databaseName, collectionName)
            .then((data) => {
                setState({ stats: data, isLoading: false, error: null })
            })
            .catch((err: unknown) => {
                console.error("Failed to get collection stats:", err)
                setState({
                    stats: null,
                    isLoading: false,
                    error: err instanceof Error ? err.message : "Failed to load stats",
                })
            })
    }

    useEffect(() => {
        if (!connectionId || !databaseName || !collectionName) {
            setState({ stats: null, isLoading: false, error: null })
            return
        }
        reload()
        // reload depends on the same inputs; intentionally not in deps
        // to avoid re-running the effect when its identity changes per render.
    }, [connectionId, databaseName, collectionName])

    return { ...state, reload }
}

function EmptyMessage({ children }: { children: React.ReactNode }): JSX.Element {
    return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
            {children}
        </div>
    )
}

export function CollectionStats({
    connectionId,
    databaseName,
    collectionName,
}: CollectionStatsProps): JSX.Element {
    const { stats, isLoading, error, reload } = useCollectionStats(
        connectionId,
        databaseName,
        collectionName,
    )

    if (!connectionId || !databaseName || !collectionName) {
        return (
            <EmptyMessage>
                <BarChart className="mr-2 h-5 w-5" />
                Select a collection to view statistics
            </EmptyMessage>
        )
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <div className="text-destructive">{error}</div>
                <Button onClick={reload} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                </Button>
            </div>
        )
    }

    if (isLoading) {
        return <EmptyMessage>Loading collection statistics...</EmptyMessage>
    }

    if (!stats) {
        return <EmptyMessage>No statistics available</EmptyMessage>
    }

    const showValidation = !!(stats.validationLevel || stats.validationAction)
    const showSharding = !!(stats.sharded && stats.shardDistribution)

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">
                        {databaseName}.{collectionName}
                    </h2>
                </div>
                <Button onClick={reload} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="overview" className="flex-1">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="storage">Storage</TabsTrigger>
                    <TabsTrigger value="indexes">Indexes</TabsTrigger>
                    {showValidation && <TabsTrigger value="validation">Validation</TabsTrigger>}
                    {showSharding && <TabsTrigger value="sharding">Sharding</TabsTrigger>}
                </TabsList>

                <OverviewTab stats={stats} />
                <StorageTab stats={stats} />
                <IndexesTab stats={stats} />
                {showValidation && <ValidationTab stats={stats} />}
                {showSharding && stats.shardDistribution && (
                    <ShardingTab distribution={stats.shardDistribution} />
                )}
            </Tabs>
        </div>
    )
}
