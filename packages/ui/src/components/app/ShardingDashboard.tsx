import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
    type ChunkDistribution,
    type ShardedCollection,
    type ShardInfo,
    usePlatform,
} from "../../contexts/PlatformContext"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Grid, RefreshCw, Server } from "lucide-react"
import { useT } from "../../i18n"

export interface ShardingDashboardProps {
    connectionId: string | null
}

export function ShardingDashboard({ connectionId }: ShardingDashboardProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [shards, setShards] = useState<ShardInfo[]>([])
    const [collections, setCollections] = useState<ShardedCollection[]>([])
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
    const [chunkDist, setChunkDist] = useState<ChunkDistribution[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingChunks, setIsLoadingChunks] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!connectionId) {
            setShards([])
            setCollections([])
            return
        }

        loadData()
    }, [connectionId])

    const loadData = (): void => {
        if (!connectionId) {
            return
        }

        setIsLoading(true)
        setError(null)

        Promise.all([
            platform.listShards(connectionId),
            platform.listShardedCollections(connectionId),
        ])
            .then(([shardsData, collectionsData]) => {
                setShards(shardsData)
                setCollections(collectionsData)
            })
            .catch((err: unknown) => {
                console.error("Failed to load sharding data:", err)
                setError(err instanceof Error ? err.message : t("sharding.loadFailed"))
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const loadChunkDistribution = (namespace: string): void => {
        if (!connectionId) {
            return
        }

        const [db, coll] = namespace.split(".")
        if (!db || !coll) {
            return
        }

        // Reset both pieces of state so a previous selection's data doesn't
        // briefly render under the new collection's title before its fetch
        // resolves.
        setSelectedCollection(namespace)
        setChunkDist([])
        setIsLoadingChunks(true)
        platform
            .getChunkDistribution(connectionId, db, coll)
            .then((data) => {
                setChunkDist(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to load chunk distribution:", err)
                toast.error(`Couldn't load chunk distribution for ${namespace}`, {
                    description: err instanceof Error ? err.message : t("common.unknownError"),
                })
            })
            .finally(() => {
                setIsLoadingChunks(false)
            })
    }

    if (!connectionId) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <Grid className="mr-2 h-5 w-5" />
                {t("sharding.selectPrompt")}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <div className="text-destructive">{error}</div>
                <Button onClick={loadData} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("sharding.retry")}
                </Button>
            </div>
        )
    }

    if (isLoading && shards.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                {t("sharding.loading")}
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">{t("sharding.title")}</h2>
                    <Badge variant="secondary">
                        {t("sharding.shardsBadge", { count: shards.length })}
                    </Badge>
                </div>
                <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    {t("sharding.refresh")}
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="shards" className="flex-1 flex flex-col">
                <TabsList>
                    <TabsTrigger value="shards">{t("sharding.tabs.shards")}</TabsTrigger>
                    <TabsTrigger value="collections">{t("sharding.tabs.collections")}</TabsTrigger>
                </TabsList>

                <TabsContent value="shards" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="space-y-3">
                            {shards.map((shard) => (
                                <Card key={shard.shardId} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-mono text-sm font-medium">
                                                {shard.shardId}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {shard.host}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    shard.state === 1 ? "default" : "destructive"
                                                }
                                            >
                                                {shard.state === 1
                                                    ? t("sharding.active")
                                                    : t("sharding.inactive")}
                                            </Badge>
                                            {shard.tags.length > 0 && (
                                                <div className="flex gap-1">
                                                    {shard.tags.map((tag) => (
                                                        <Badge key={tag} variant="outline">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="collections" className="flex-1 overflow-hidden">
                    <div className="flex h-full gap-4">
                        {/* Collections List */}
                        <div className="w-1/2 overflow-hidden rounded-lg border">
                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                {t("sharding.columns.collection")}
                                            </TableHead>
                                            <TableHead>{t("sharding.columns.shardKey")}</TableHead>
                                            <TableHead>{t("sharding.columns.options")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {collections.map((coll) => (
                                            <TableRow
                                                key={coll.namespace}
                                                role="button"
                                                tabIndex={0}
                                                aria-pressed={selectedCollection === coll.namespace}
                                                className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                                                onClick={() => {
                                                    loadChunkDistribution(coll.namespace)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault()
                                                        loadChunkDistribution(coll.namespace)
                                                    }
                                                }}
                                            >
                                                <TableCell className="font-mono text-sm">
                                                    {coll.namespace}
                                                </TableCell>
                                                <TableCell>
                                                    <code className="rounded bg-muted px-2 py-1 text-xs">
                                                        {JSON.stringify(coll.shardKey)}
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {coll.unique && (
                                                            <Badge variant="outline">
                                                                {t("sharding.unique")}
                                                            </Badge>
                                                        )}
                                                        {coll.balancing && (
                                                            <Badge variant="secondary">
                                                                {t("sharding.balancing")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>

                        {/* Chunk Distribution */}
                        <div className="w-1/2 overflow-hidden rounded-lg border">
                            {selectedCollection ? (
                                <div className="p-4">
                                    <h3 className="mb-4 font-semibold">{selectedCollection}</h3>
                                    {isLoadingChunks ? (
                                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                                            {t("sharding.chunkLoading")}
                                        </div>
                                    ) : chunkDist.length === 0 ? (
                                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                                            {t("sharding.chunkEmpty")}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {chunkDist.map((dist) => (
                                                <div
                                                    key={dist.shardId}
                                                    className="flex items-center justify-between rounded-md border p-3"
                                                >
                                                    <div className="font-mono text-sm">
                                                        {dist.shardId}
                                                    </div>
                                                    <Badge variant="default">
                                                        {t("sharding.chunksBadge", {
                                                            count: dist.chunkCount,
                                                        })}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    {t("sharding.selectCollection")}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
