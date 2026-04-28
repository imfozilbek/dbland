import { useEffect, useState } from "react"
import { toast } from "sonner"
import { type Index, type IndexStats, usePlatform } from "../../contexts/PlatformContext"
import { useConfirm } from "../../hooks/use-confirm"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Database, Plus, RefreshCw, Trash2 } from "lucide-react"
import { EmptyState } from "../ui/empty-state"
import { CreateIndexDialog } from "./CreateIndexDialog"
import { useT } from "../../i18n"

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
    const t = useT()
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
            title: t("indexManager.dropConfirmTitle"),
            description: t("indexManager.dropConfirmDescription", {
                name: indexName,
                db: databaseName,
                coll: collectionName,
            }),
            confirmLabel: t("indexManager.dropConfirmLabel"),
            destructive: true,
        })
        if (!confirmed) {
            return
        }

        platform
            .dropIndex(connectionId, databaseName, collectionName, indexName)
            .then(() => {
                loadIndexes()
                toast.success(t("indexManager.dropped"), { description: indexName })
            })
            .catch((err: unknown) => {
                console.error("Failed to drop index:", err)
                toast.error(t("indexManager.dropFailed"), {
                    description: err instanceof Error ? err.message : t("common.unknownError"),
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
                    <h2 className="text-lg font-semibold">{t("indexManager.title")}</h2>
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
                        {t("indexManager.refresh")}
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            setShowCreateDialog(true)
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        {t("indexManager.createButton")}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {indexes.length === 0 ? (
                        <Card className="p-2">
                            <EmptyState
                                icon={<Database className="h-5 w-5" />}
                                title={t("indexManager.emptyTitle")}
                                description={t("indexManager.emptyDescription", {
                                    coll: collectionName,
                                })}
                                action={
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setShowCreateDialog(true)
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t("indexManager.emptyAction")}
                                    </Button>
                                }
                            />
                        </Card>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("indexManager.columns.name")}</TableHead>
                                    <TableHead>{t("indexManager.columns.keys")}</TableHead>
                                    <TableHead>{t("indexManager.columns.properties")}</TableHead>
                                    <TableHead>{t("indexManager.columns.usage")}</TableHead>
                                    <TableHead className="text-right">
                                        {t("indexManager.columns.actions")}
                                    </TableHead>
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
                                                        <Badge variant="secondary">
                                                            {t("indexManager.badges.unique")}
                                                        </Badge>
                                                    )}
                                                    {index.sparse && (
                                                        <Badge variant="secondary">
                                                            {t("indexManager.badges.sparse")}
                                                        </Badge>
                                                    )}
                                                    {index.ttl && (
                                                        <Badge variant="secondary">
                                                            {t("indexManager.badges.ttl", {
                                                                seconds: index.ttl,
                                                            })}
                                                        </Badge>
                                                    )}
                                                    {index.background && (
                                                        <Badge variant="secondary">
                                                            {t("indexManager.badges.background")}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {indexStats ? (
                                                    <div>
                                                        <div>
                                                            {t("indexManager.accesses", {
                                                                count:
                                                                    indexStats.accesses?.toLocaleString() ||
                                                                    "0",
                                                            })}
                                                        </div>
                                                        {indexStats.since && (
                                                            <div className="text-xs">
                                                                {t("indexManager.since", {
                                                                    date: indexStats.since,
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span>{t("indexManager.noStats")}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    aria-label={t("indexManager.dropAriaLabel", {
                                                        name: index.name,
                                                    })}
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
