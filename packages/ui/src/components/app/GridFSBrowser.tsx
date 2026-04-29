import { useCallback, useEffect, useState } from "react"
import { extractErrorMessage } from "@dbland/core"
import { toast } from "sonner"
import { type GridFSFile, usePlatform } from "../../contexts/PlatformContext"
import { useConfirm } from "../../hooks/use-confirm"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { ScrollArea } from "../ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Download, File, FolderOpen, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { EmptyState } from "../ui/empty-state"
import { useT } from "../../i18n"

export interface GridFSBrowserProps {
    connectionId: string | null
    databaseName: string | null
}

export function GridFSBrowser({ connectionId, databaseName }: GridFSBrowserProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [confirm, confirmDialog] = useConfirm()
    const [files, setFiles] = useState<GridFSFile[]>([])
    const [bucket, setBucket] = useState("fs")
    const [isLoading, setIsLoading] = useState(false)
    const [filterText, setFilterText] = useState("")

    // Stable reference for the bootstrap effect's dep array. Without
    // useCallback the loader was a fresh closure each render and the
    // exhaustive-deps lint had no way to verify the closure picked up
    // a new `platform` or `t`. The bound deps are the actual inputs
    // the loader reads.
    const loadFiles = useCallback((): void => {
        if (!connectionId || !databaseName) {
            return
        }

        setIsLoading(true)
        platform
            .listGridFSFiles(connectionId, databaseName, bucket, 100)
            .then((data) => {
                setFiles(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to load GridFS files:", err)
                // An empty file list and "request rejected" produce the same
                // visible result otherwise — surface the underlying error so
                // the user knows whether their bucket is empty or unreachable.
                setFiles([])
                toast.error(t("gridfs.loadFailed"), {
                    description: extractErrorMessage(err) || t("common.unknownError"),
                })
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [connectionId, databaseName, bucket, platform, t])

    useEffect(() => {
        if (!connectionId || !databaseName) {
            setFiles([])
            return
        }

        loadFiles()
    }, [connectionId, databaseName, loadFiles])

    const handleDownload = async (file: GridFSFile): Promise<void> => {
        if (!connectionId || !databaseName) {
            return
        }

        try {
            const savePath = await platform.saveFileDialog(file.filename)
            if (!savePath) {
                return
            }

            await platform.downloadGridFSFile(connectionId, databaseName, file.id, savePath, bucket)
            toast.success(t("gridfs.downloadComplete"), {
                description: savePath,
            })
        } catch (err: unknown) {
            console.error("Failed to download file:", err)
            toast.error(t("gridfs.downloadFailed"), {
                description: extractErrorMessage(err) || t("common.unknownError"),
            })
        }
    }

    const handleDelete = async (file: GridFSFile): Promise<void> => {
        if (!connectionId || !databaseName) {
            return
        }

        const confirmed = await confirm({
            title: t("gridfs.deleteConfirmTitle"),
            description: t("gridfs.deleteConfirmDescription", { name: file.filename }),
            confirmLabel: t("common.delete"),
            destructive: true,
        })
        if (!confirmed) {
            return
        }

        platform
            .deleteGridFSFile(connectionId, databaseName, file.id, bucket)
            .then(() => {
                setFiles((prev) => prev.filter((f) => f.id !== file.id))
                toast.success(t("gridfs.deleted"), { description: file.filename })
            })
            .catch((err: unknown) => {
                console.error("Failed to delete file:", err)
                toast.error(t("gridfs.deleteFailed"), {
                    description: extractErrorMessage(err) || t("common.unknownError"),
                })
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

    const formatDate = (dateStr: string): string => {
        try {
            return new Date(dateStr).toLocaleString()
        } catch {
            return dateStr
        }
    }

    const filteredFiles = files.filter((file) =>
        file.filename.toLowerCase().includes(filterText.toLowerCase()),
    )

    if (!connectionId || !databaseName) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <File className="mr-2 h-5 w-5" />
                {t("gridfs.selectPrompt")}
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            {/* Controls */}
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="bucket">{t("gridfs.bucketLabel")}</Label>
                    <Input
                        id="bucket"
                        value={bucket}
                        onChange={(e) => {
                            setBucket(e.target.value)
                        }}
                        placeholder={t("gridfs.bucketPlaceholder")}
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="filter">{t("gridfs.filterLabel")}</Label>
                    <Input
                        id="filter"
                        value={filterText}
                        onChange={(e) => {
                            setFilterText(e.target.value)
                        }}
                        placeholder={t("gridfs.filterPlaceholder")}
                    />
                </div>
                <Button onClick={loadFiles} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("gridfs.refresh")}
                </Button>
            </div>

            {/* File count */}
            {files.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    {t("gridfs.showing", { shown: filteredFiles.length, total: files.length })}
                </div>
            )}

            {/* Files Table */}
            <div className="flex-1 overflow-hidden rounded-lg border">
                <ScrollArea className="h-full">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center gap-2 text-[var(--muted-foreground)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">{t("gridfs.loading")}</span>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex h-40 items-center justify-center">
                            <EmptyState
                                icon={<FolderOpen className="h-5 w-5" />}
                                title={
                                    filterText
                                        ? t("gridfs.emptyMatchTitle")
                                        : t("gridfs.emptyBucketTitle")
                                }
                                description={
                                    filterText
                                        ? t("gridfs.emptyMatchDescription", {
                                              bucket,
                                              filter: filterText,
                                          })
                                        : t("gridfs.emptyBucketDescription", { bucket })
                                }
                            />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("gridfs.columns.filename")}</TableHead>
                                    <TableHead>{t("gridfs.columns.size")}</TableHead>
                                    <TableHead>{t("gridfs.columns.uploadDate")}</TableHead>
                                    <TableHead>{t("gridfs.columns.contentType")}</TableHead>
                                    <TableHead>{t("gridfs.columns.md5")}</TableHead>
                                    <TableHead className="text-right">
                                        {t("gridfs.columns.actions")}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFiles.map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                                {file.filename}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {formatBytes(file.length)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {formatDate(file.uploadDate)}
                                        </TableCell>
                                        <TableCell>
                                            {file.contentType && (
                                                <Badge variant="secondary">
                                                    {file.contentType}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {file.md5?.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    aria-label={t("gridfs.downloadAria", {
                                                        name: file.filename,
                                                    })}
                                                    onClick={() => {
                                                        void handleDownload(file)
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    aria-label={t("gridfs.deleteAria", {
                                                        name: file.filename,
                                                    })}
                                                    onClick={() => {
                                                        void handleDelete(file)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </div>
            {confirmDialog}
        </div>
    )
}
