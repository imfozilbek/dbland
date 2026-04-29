import { useState } from "react"
import { extractErrorMessage } from "@dbland/core"
import { usePlatform } from "../../contexts/PlatformContext"
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
import { Textarea } from "../ui/textarea"
import { Switch } from "../ui/switch"
import { useT } from "../../i18n"

export interface CreateIndexDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectionId: string
    databaseName: string
    collectionName: string
    onCreated?: () => void
}

export function CreateIndexDialog({
    open,
    onOpenChange,
    connectionId,
    databaseName,
    collectionName,
    onCreated,
}: CreateIndexDialogProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [indexName, setIndexName] = useState("")
    const [keysJson, setKeysJson] = useState('{"field": 1}')
    const [unique, setUnique] = useState(false)
    const [sparse, setSparse] = useState(false)
    const [ttl, setTtl] = useState("")
    const [background, setBackground] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = (): void => {
        setError(null)

        let keys: Record<string, number>
        try {
            keys = JSON.parse(keysJson) as Record<string, number>
        } catch (_err) {
            setError(t("createIndex.invalidJson"))
            return
        }

        setIsCreating(true)

        platform
            .createIndex({
                connectionId,
                databaseName,
                collectionName,
                keys,
                unique: unique || undefined,
                sparse: sparse || undefined,
                ttlSeconds: ttl ? parseInt(ttl, 10) : undefined,
                background: background || undefined,
                name: indexName || undefined,
            })
            .then(() => {
                onOpenChange(false)
                setIndexName("")
                setKeysJson('{"field": 1}')
                setUnique(false)
                setSparse(false)
                setTtl("")
                setBackground(false)
                if (onCreated) {
                    onCreated()
                }
            })
            .catch((err: unknown) => {
                setError(extractErrorMessage(err) || t("createIndex.defaultError"))
            })
            .finally(() => {
                setIsCreating(false)
            })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("createIndex.title")}</DialogTitle>
                    <DialogDescription>
                        {t("createIndex.description", {
                            db: databaseName,
                            coll: collectionName,
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="index-name">{t("createIndex.indexNameLabel")}</Label>
                        <Input
                            id="index-name"
                            value={indexName}
                            onChange={(e) => {
                                setIndexName(e.target.value)
                            }}
                            placeholder={t("createIndex.indexNamePlaceholder")}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="keys">{t("createIndex.keysLabel")}</Label>
                        <Textarea
                            id="keys"
                            value={keysJson}
                            onChange={(e) => {
                                setKeysJson(e.target.value)
                                setError(null)
                            }}
                            rows={4}
                            className="font-mono text-sm"
                            placeholder={t("createIndex.keysPlaceholder")}
                        />
                        <p className="text-xs text-muted-foreground">{t("createIndex.keysHint")}</p>
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="unique">{t("createIndex.unique")}</Label>
                            <Switch id="unique" checked={unique} onCheckedChange={setUnique} />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="sparse">{t("createIndex.sparse")}</Label>
                            <Switch id="sparse" checked={sparse} onCheckedChange={setSparse} />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="background">{t("createIndex.backgroundBuild")}</Label>
                            <Switch
                                id="background"
                                checked={background}
                                onCheckedChange={setBackground}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ttl">{t("createIndex.ttlLabel")}</Label>
                            <Input
                                id="ttl"
                                type="number"
                                value={ttl}
                                onChange={(e) => {
                                    setTtl(e.target.value)
                                }}
                                placeholder="3600"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                        }}
                        disabled={isCreating}
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? t("createIndex.creating") : t("createIndex.createButton")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
