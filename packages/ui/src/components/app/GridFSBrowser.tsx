import { useEffect, useState } from "react"
import { type GridFSFile, usePlatform } from "../../contexts/PlatformContext"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { ScrollArea } from "../ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Download, File, RefreshCw, Trash2 } from "lucide-react"

export interface GridFSBrowserProps {
    connectionId: string | null
    databaseName: string | null
}

export function GridFSBrowser({ connectionId, databaseName }: GridFSBrowserProps): JSX.Element {
    const platform = usePlatform()
    const [files, setFiles] = useState<GridFSFile[]>([])
    const [bucket, setBucket] = useState("fs")
    const [isLoading, setIsLoading] = useState(false)
    const [filterText, setFilterText] = useState("")

    useEffect(() => {
        if (!connectionId || !databaseName) {
            setFiles([])
            return
        }

        loadFiles()
    }, [connectionId, databaseName, bucket])

    const loadFiles = (): void => {
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
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

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
            // eslint-disable-next-line no-alert
            alert(`File downloaded to: ${savePath}`)
        } catch (err: unknown) {
            console.error("Failed to download file:", err)
            // eslint-disable-next-line no-alert
            alert(`Download failed: ${err instanceof Error ? err.message : "Unknown error"}`)
        }
    }

    const handleDelete = (file: GridFSFile): void => {
        if (!connectionId || !databaseName) {
            return
        }

        // eslint-disable-next-line no-alert
        if (!confirm(`Delete file "${file.filename}"?`)) {
            return
        }

        platform
            .deleteGridFSFile(connectionId, databaseName, file.id, bucket)
            .then(() => {
                setFiles((prev) => prev.filter((f) => f.id !== file.id))
            })
            .catch((err: unknown) => {
                console.error("Failed to delete file:", err)
                // eslint-disable-next-line no-alert
                alert(`Delete failed: ${err instanceof Error ? err.message : "Unknown error"}`)
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
                Select a database to browse GridFS files
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            {/* Controls */}
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="bucket">Bucket</Label>
                    <Input
                        id="bucket"
                        value={bucket}
                        onChange={(e) => {
                            setBucket(e.target.value)
                        }}
                        placeholder="fs"
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="filter">Filter by filename</Label>
                    <Input
                        id="filter"
                        value={filterText}
                        onChange={(e) => {
                            setFilterText(e.target.value)
                        }}
                        placeholder="Search files..."
                    />
                </div>
                <Button onClick={loadFiles} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* File count */}
            {files.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    Showing {filteredFiles.length} of {files.length} files
                </div>
            )}

            {/* Files Table */}
            <div className="flex-1 overflow-hidden rounded-lg border">
                <ScrollArea className="h-full">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                            Loading GridFS files...
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                            {filterText ? "No matching files found" : "No files in this bucket"}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Filename</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Upload Date</TableHead>
                                    <TableHead>Content Type</TableHead>
                                    <TableHead>MD5</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
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
                                                    onClick={() => {
                                                        void handleDownload(file)
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        handleDelete(file)
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
        </div>
    )
}
