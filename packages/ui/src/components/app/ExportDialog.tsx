import { useState } from "react"
import { extractErrorMessage } from "@dbland/core"
import { type ExportOptions, usePlatform } from "../../contexts/PlatformContext"
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
import { Textarea } from "../ui/textarea"
import { FileDown } from "lucide-react"
import { useT } from "../../i18n"

export interface ExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectionId: string
    databaseName?: string
    collectionName?: string
    onExported?: () => void
}

export function ExportDialog({
    open,
    onOpenChange,
    connectionId,
    databaseName: initialDatabase = "",
    collectionName: initialCollection = "",
    onExported,
}: ExportDialogProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [filePath, setFilePath] = useState("")
    const [format, setFormat] = useState("json")
    const [databaseName, setDatabaseName] = useState(initialDatabase)
    const [collectionName, setCollectionName] = useState(initialCollection)
    const [query, setQuery] = useState("")
    const [isExporting, setIsExporting] = useState(false)
    const [result, setResult] = useState<{
        success: boolean
        exported: number
        error?: string
    } | null>(null)

    const handleBrowse = (): void => {
        const extensions = format === "json" ? ["json"] : format === "csv" ? ["csv"] : ["bson"]
        const defaultName = `${collectionName || "export"}.${format}`

        platform
            .saveFileDialog(defaultName, extensions)
            .then((path) => {
                if (path) {
                    setFilePath(path)
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to open save dialog:", err)
            })
    }

    const handleExport = (): void => {
        if (!filePath || !databaseName || !collectionName) {
            return
        }

        setIsExporting(true)
        setResult(null)

        const options: ExportOptions = {
            filePath,
            format,
            databaseName,
            collectionName,
            query: query || undefined,
        }

        platform
            .exportData(connectionId, options)
            .then((res) => {
                setResult(res)
                if (res.success && onExported) {
                    onExported()
                }
            })
            .catch((err: unknown) => {
                setResult({
                    success: false,
                    exported: 0,
                    error: extractErrorMessage(err) || t("exportDialog.defaultError"),
                })
            })
            .finally(() => {
                setIsExporting(false)
            })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("exportDialog.title")}</DialogTitle>
                    <DialogDescription>{t("exportDialog.description")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="export-format">{t("exportDialog.formatLabel")}</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger id="export-format">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="csv" disabled>
                                    {t("importDialog.csvComingSoon")}
                                </SelectItem>
                                <SelectItem value="bson" disabled>
                                    {t("importDialog.bsonComingSoon")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="export-database">{t("exportDialog.databaseLabel")}</Label>
                        <Input
                            id="export-database"
                            value={databaseName}
                            onChange={(e) => {
                                setDatabaseName(e.target.value)
                            }}
                            placeholder={t("exportDialog.databasePlaceholder")}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="export-collection">
                            {t("exportDialog.collectionLabel")}
                        </Label>
                        <Input
                            id="export-collection"
                            value={collectionName}
                            onChange={(e) => {
                                setCollectionName(e.target.value)
                            }}
                            placeholder={t("exportDialog.collectionPlaceholder")}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="export-query">{t("exportDialog.queryLabel")}</Label>
                        <Textarea
                            id="export-query"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                            }}
                            placeholder={t("exportDialog.queryPlaceholder")}
                            rows={3}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="export-file">{t("exportDialog.saveToLabel")}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="export-file"
                                value={filePath}
                                onChange={(e) => {
                                    setFilePath(e.target.value)
                                }}
                                placeholder={t("exportDialog.saveToPlaceholder")}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label={t("exportDialog.browseLabel")}
                                onClick={handleBrowse}
                            >
                                <FileDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {result && (
                        <div
                            className={`rounded-md border p-3 text-sm ${
                                result.success
                                    ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                                    : "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]"
                            }`}
                        >
                            {result.success ? (
                                <div>
                                    <strong>{t("exportDialog.successPrefix")}</strong>{" "}
                                    {t("exportDialog.successMessage", { count: result.exported })}
                                </div>
                            ) : (
                                <div>
                                    <strong>{t("exportDialog.failedPrefix")}</strong>{" "}
                                    {result.error || t("exportDialog.unknownError")}
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
                        disabled={isExporting}
                    >
                        {result ? t("common.close") : t("common.cancel")}
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={!filePath || !databaseName || !collectionName || isExporting}
                    >
                        {isExporting ? t("exportDialog.exporting") : t("exportDialog.exportButton")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
