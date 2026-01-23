import * as React from "react"
import { useState } from "react"
import { type ImportOptions, usePlatform } from "../../contexts/PlatformContext"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { FileUp } from "lucide-react"

export interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectionId: string
    onImported?: () => void
}

export function ImportDialog({
    open,
    onOpenChange,
    connectionId,
    onImported,
}: ImportDialogProps): JSX.Element {
    const platform = usePlatform()
    const [filePath, setFilePath] = useState("")
    const [format, setFormat] = useState("json")
    const [databaseName, setDatabaseName] = useState("")
    const [collectionName, setCollectionName] = useState("")
    const [isImporting, setIsImporting] = useState(false)
    const [result, setResult] = useState<{
        success: boolean
        imported: number
        failed: number
        errors: string[]
    } | null>(null)

    const handleBrowse = (): void => {
        const extensions = format === "json" ? ["json"] : format === "csv" ? ["csv"] : ["bson"]
        platform
            .openFileDialog(extensions)
            .then((path) => {
                if (path) {
                    setFilePath(path)
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to open file dialog:", err)
            })
    }

    const handleImport = (): void => {
        if (!filePath || !databaseName || !collectionName) {
            return
        }

        setIsImporting(true)
        setResult(null)

        const options: ImportOptions = {
            filePath,
            format,
            databaseName,
            collectionName,
        }

        platform
            .importData(connectionId, options)
            .then((res) => {
                setResult(res)
                if (res.success && onImported) {
                    onImported()
                }
            })
            .catch((err: unknown) => {
                setResult({
                    success: false,
                    imported: 0,
                    failed: 0,
                    errors: [err instanceof Error ? err.message : "Import failed"],
                })
            })
            .finally(() => {
                setIsImporting(false)
            })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Data</DialogTitle>
                    <DialogDescription>
                        Import documents from a file into your database collection.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="format">Format</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger id="format">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="csv" disabled>
                                    CSV (Coming soon)
                                </SelectItem>
                                <SelectItem value="bson" disabled>
                                    BSON (Coming soon)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="file">File</Label>
                        <div className="flex gap-2">
                            <Input
                                id="file"
                                value={filePath}
                                onChange={(e) => {
                                    setFilePath(e.target.value)
                                }}
                                placeholder="/path/to/file.json"
                                className="flex-1"
                            />
                            <Button variant="outline" size="icon" onClick={handleBrowse}>
                                <FileUp className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="database">Database</Label>
                        <Input
                            id="database"
                            value={databaseName}
                            onChange={(e) => {
                                setDatabaseName(e.target.value)
                            }}
                            placeholder="mydb"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="collection">Collection</Label>
                        <Input
                            id="collection"
                            value={collectionName}
                            onChange={(e) => {
                                setCollectionName(e.target.value)
                            }}
                            placeholder="mycollection"
                        />
                    </div>

                    {result && (
                        <div
                            className={`rounded-md p-3 text-sm ${
                                result.success
                                    ? "bg-green-50 text-green-600 dark:bg-green-950"
                                    : "bg-red-50 text-red-600 dark:bg-red-950"
                            }`}
                        >
                            {result.success ? (
                                <div>
                                    <strong>Success!</strong> Imported {result.imported} documents.
                                </div>
                            ) : (
                                <div>
                                    <strong>Failed.</strong> Imported {result.imported}, failed{" "}
                                    {result.failed}.
                                    {result.errors.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {result.errors.map((err, i) => (
                                                <div key={i} className="text-xs">
                                                    {err}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                        }}
                        disabled={isImporting}
                    >
                        {result ? "Close" : "Cancel"}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!filePath || !databaseName || !collectionName || isImporting}
                    >
                        {isImporting ? "Importing..." : "Import"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
