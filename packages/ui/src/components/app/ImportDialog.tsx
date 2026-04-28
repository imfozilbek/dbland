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
import { useT } from "../../i18n"

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
    const t = useT()
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
                    errors: [err instanceof Error ? err.message : t("importDialog.defaultError")],
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
                    <DialogTitle>{t("importDialog.title")}</DialogTitle>
                    <DialogDescription>{t("importDialog.description")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="format">{t("importDialog.formatLabel")}</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger id="format">
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
                        <Label htmlFor="file">{t("importDialog.fileLabel")}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="file"
                                value={filePath}
                                onChange={(e) => {
                                    setFilePath(e.target.value)
                                }}
                                placeholder={t("importDialog.filePlaceholder")}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label={t("importDialog.browseLabel")}
                                onClick={handleBrowse}
                            >
                                <FileUp className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="database">{t("importDialog.databaseLabel")}</Label>
                        <Input
                            id="database"
                            value={databaseName}
                            onChange={(e) => {
                                setDatabaseName(e.target.value)
                            }}
                            placeholder={t("importDialog.databasePlaceholder")}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="collection">{t("importDialog.collectionLabel")}</Label>
                        <Input
                            id="collection"
                            value={collectionName}
                            onChange={(e) => {
                                setCollectionName(e.target.value)
                            }}
                            placeholder={t("importDialog.collectionPlaceholder")}
                        />
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
                                    <strong>{t("importDialog.successPrefix")}</strong>{" "}
                                    {t("importDialog.successMessage", { count: result.imported })}
                                </div>
                            ) : (
                                <div>
                                    <strong>{t("importDialog.failedPrefix")}</strong>{" "}
                                    {t("importDialog.failedSummary", {
                                        imported: result.imported,
                                        failed: result.failed,
                                    })}
                                    {result.errors.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {result.errors.map((err, i) => (
                                                <div
                                                    key={`${i}-${err.slice(0, 16)}`}
                                                    className="text-xs"
                                                >
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
                        {result ? t("common.close") : t("common.cancel")}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!filePath || !databaseName || !collectionName || isImporting}
                    >
                        {isImporting ? t("importDialog.importing") : t("importDialog.importButton")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
