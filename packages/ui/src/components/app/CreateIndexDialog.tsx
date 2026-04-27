import { useState } from "react"
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
            setError("Invalid JSON for keys")
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
                setError(err instanceof Error ? err.message : "Failed to create index")
            })
            .finally(() => {
                setIsCreating(false)
            })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Index</DialogTitle>
                    <DialogDescription>
                        Create a new index for {databaseName}.{collectionName}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="index-name">Index Name (optional)</Label>
                        <Input
                            id="index-name"
                            value={indexName}
                            onChange={(e) => {
                                setIndexName(e.target.value)
                            }}
                            placeholder="my_index"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="keys">Keys (JSON)</Label>
                        <Textarea
                            id="keys"
                            value={keysJson}
                            onChange={(e) => {
                                setKeysJson(e.target.value)
                                setError(null)
                            }}
                            rows={4}
                            className="font-mono text-sm"
                            placeholder='{"field1": 1, "field2": -1}'
                        />
                        <p className="text-xs text-muted-foreground">
                            1 for ascending, -1 for descending
                        </p>
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="unique">Unique</Label>
                            <Switch id="unique" checked={unique} onCheckedChange={setUnique} />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="sparse">Sparse</Label>
                            <Switch id="sparse" checked={sparse} onCheckedChange={setSparse} />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="background">Background Build</Label>
                            <Switch
                                id="background"
                                checked={background}
                                onCheckedChange={setBackground}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ttl">TTL (seconds, optional)</Label>
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
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">
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
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
