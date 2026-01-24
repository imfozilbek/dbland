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

export function CollectionStats({
    connectionId,
    databaseName,
    collectionName,
}: CollectionStatsProps): JSX.Element {
    const platform = usePlatform()
    const [stats, setStats] = useState<DetailedCollectionStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!connectionId || !databaseName || !collectionName) {
            setStats(null)
            return
        }

        loadStats()
    }, [connectionId, databaseName, collectionName])

    const loadStats = (): void => {
        if (!connectionId || !databaseName || !collectionName) {
            return
        }

        setIsLoading(true)
        setError(null)
        platform
            .getDetailedCollectionStats(connectionId, databaseName, collectionName)
            .then((data) => {
                setStats(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to get collection stats:", err)
                setError(err instanceof Error ? err.message : "Failed to load stats")
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) {
            return "0 B"
        }
        const k = 1024
        const sizes = ["B", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
    }

    if (!connectionId || !databaseName || !collectionName) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <BarChart className="mr-2 h-5 w-5" />
                Select a collection to view statistics
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <div className="text-destructive">{error}</div>
                <Button onClick={loadStats} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                </Button>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading collection statistics...
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                No statistics available
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">
                        {databaseName}.{collectionName}
                    </h2>
                </div>
                <Button onClick={loadStats} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats Tabs */}
            <Tabs defaultValue="overview" className="flex-1">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="storage">Storage</TabsTrigger>
                    <TabsTrigger value="indexes">Indexes</TabsTrigger>
                    {(stats.validationLevel || stats.validationAction) && (
                        <TabsTrigger value="validation">Validation</TabsTrigger>
                    )}
                    {stats.sharded && <TabsTrigger value="sharding">Sharding</TabsTrigger>}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Document Count</div>
                            <div className="text-2xl font-bold">{stats.count.toLocaleString()}</div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Total Size</div>
                            <div className="text-2xl font-bold">{formatBytes(stats.size)}</div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Avg Doc Size</div>
                            <div className="text-2xl font-bold">
                                {formatBytes(stats.avgObjSize)}
                            </div>
                        </Card>
                    </div>

                    {stats.capped && (
                        <Card className="p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <Badge variant="default">Capped Collection</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {stats.max && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Max Documents
                                        </div>
                                        <div className="text-lg font-medium">
                                            {stats.max.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {stats.maxSize && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Max Size
                                        </div>
                                        <div className="text-lg font-medium">
                                            {formatBytes(stats.maxSize)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="storage" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Storage Size</div>
                            <div className="text-2xl font-bold">
                                {formatBytes(stats.storageSize)}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Index Size</div>
                            <div className="text-2xl font-bold">
                                {formatBytes(stats.totalIndexSize)}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Extents</div>
                            <div className="text-2xl font-bold">{stats.numExtents}</div>
                        </Card>
                        {stats.numOrphanDocs !== undefined && (
                            <Card className="p-4">
                                <div className="text-sm text-muted-foreground">Orphan Docs</div>
                                <div className="text-2xl font-bold">{stats.numOrphanDocs}</div>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="indexes" className="space-y-4">
                    <div className="rounded-lg border p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Index Sizes</h3>
                            <Badge variant="secondary">
                                Total: {formatBytes(stats.totalIndexSize)}
                            </Badge>
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

                {(stats.validationLevel || stats.validationAction) && (
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
                )}

                {stats.sharded && stats.shardDistribution && (
                    <TabsContent value="sharding" className="space-y-4">
                        <Card className="p-4">
                            <div className="mb-4 flex items-center gap-2">
                                <Badge variant="default">Sharded Collection</Badge>
                            </div>
                            <h3 className="mb-4 font-semibold">Shard Distribution</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.shardDistribution).map(([shard, count]) => (
                                    <div
                                        key={shard}
                                        className="flex items-center justify-between rounded-md border p-3"
                                    >
                                        <div className="font-mono text-sm">{shard}</div>
                                        <Badge variant="secondary">
                                            {count.toLocaleString()} chunks
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
