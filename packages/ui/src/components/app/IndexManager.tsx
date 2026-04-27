import { useEffect, useState } from "react"
import { toast } from "sonner"
import { type Index, type IndexStats, usePlatform } from "../../contexts/PlatformContext"
import { useConfirm } from "../../hooks/use-confirm"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Plus, RefreshCw, Trash2 } from "lucide-react"
import { CreateIndexDialog } from "./CreateIndexDialog"

export interface IndexManagerProps {
    connectionId: string
    databaseName: string
    collectionName: string
}

export function IndexManager({
    connectionId,
    databaseName,
    collectionName,
}: IndexManagerProps): JSX.Element {
    const platform = usePlatform()
    const [confirm, confirmDialog] = useConfirm()
    const [indexes, setIndexes] = useState<Index[]>([])
    const [stats, setStats] = useState<IndexStats[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showCreateDialog, setShowCreateDialog] = useState(false)

    const loadIndexes = (): void => {
        setIsLoading(true)
        Promise.all([
            platform.getIndexes(connectionId, databaseName, collectionName),
            platform.getIndexStats(connectionId, databaseName, collectionName),
        ])
            .then(([indexesData, statsData]) => {
                setIndexes(indexesData)
                setStats(statsData)
            })
            .catch((err: unknown) => {
                console.error("Failed to load indexes:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    useEffect(() => {
        loadIndexes()
    }, [connectionId, databaseName, collectionName])

    const handleDropIndex = async (indexName: string): Promise<void> => {
        const confirmed = await confirm({
            title: "Drop index?",
            description: `"${indexName}" will be dropped from ${databaseName}.${collectionName}. Queries that relied on it may slow down.`,
            confirmLabel: "Drop",
            destructive: true,
        })
        if (!confirmed) {
            return
        }

        platform
            .dropIndex(connectionId, databaseName, collectionName, indexName)
            .then(() => {
                loadIndexes()
                toast.success("Index dropped", { description: indexName })
            })
            .catch((err: unknown) => {
                console.error("Failed to drop index:", err)
                toast.error("Failed to drop index", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
            })
    }

    const getIndexStats = (indexName: string): IndexStats | undefined => {
        return stats.find((s) => s.name === indexName)
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-3">
                <div>
                    <h2 className="text-lg font-semibold">Index Manager</h2>
                    <p className="text-sm text-muted-foreground">
                        {databaseName}.{collectionName}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={loadIndexes}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            setShowCreateDialog(true)
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Create Index
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {indexes.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">No indexes found</p>
                        </Card>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Keys</TableHead>
                                    <TableHead>Properties</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {indexes.map((index) => {
                                    const indexStats = getIndexStats(index.name)
                                    return (
                                        <TableRow key={index.name}>
                                            <TableCell className="font-mono text-sm">
                                                {index.name}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {JSON.stringify(index.keys)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {index.unique && (
                                                        <Badge variant="secondary">Unique</Badge>
                                                    )}
                                                    {index.sparse && (
                                                        <Badge variant="secondary">Sparse</Badge>
                                                    )}
                                                    {index.ttl && (
                                                        <Badge variant="secondary">
                                                            TTL: {index.ttl}s
                                                        </Badge>
                                                    )}
                                                    {index.background && (
                                                        <Badge variant="secondary">
                                                            Background
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {indexStats ? (
                                                    <div>
                                                        <div>
                                                            {indexStats.accesses?.toLocaleString() ||
                                                                0}{" "}
                                                            accesses
                                                        </div>
                                                        {indexStats.since && (
                                                            <div className="text-xs">
                                                                Since: {indexStats.since}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span>No stats</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    aria-label={`Drop index ${index.name}`}
                                                    className="h-8 text-[var(--destructive)] hover:text-[var(--destructive)]/80"
                                                    onClick={() => {
                                                        void handleDropIndex(index.name)
                                                    }}
                                                    disabled={index.name === "_id_"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </ScrollArea>

            <CreateIndexDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                connectionId={connectionId}
                databaseName={databaseName}
                collectionName={collectionName}
                onCreated={loadIndexes}
            />
            {confirmDialog}
        </div>
    )
}
