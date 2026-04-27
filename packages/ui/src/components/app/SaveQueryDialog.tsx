import { useState } from "react"
import { type NewSavedQuery, usePlatform } from "../../contexts/PlatformContext"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"

export interface SaveQueryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectionId: string
    query: string
    language: string
    databaseName?: string
    collectionName?: string
    onSaved?: () => void
}

export function SaveQueryDialog({
    open,
    onOpenChange,
    connectionId,
    query,
    language,
    databaseName,
    collectionName,
    onSaved,
}: SaveQueryDialogProps): JSX.Element {
    const platform = usePlatform()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [tags, setTags] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = (): void => {
        if (!name.trim()) {
            return
        }

        setIsSaving(true)

        const newQuery: NewSavedQuery = {
            connectionId,
            name: name.trim(),
            description: description.trim() || undefined,
            query,
            language,
            databaseName,
            collectionName,
            tags: tags.trim() || undefined,
        }

        platform
            .saveQuery(newQuery)
            .then(() => {
                setName("")
                setDescription("")
                setTags("")
                onOpenChange(false)
                if (onSaved) {
                    onSaved()
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to save query:", err)
            })
            .finally(() => {
                setIsSaving(false)
            })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Save Query</DialogTitle>
                    <DialogDescription>
                        Save this query for later use. You can add a name, description, and tags.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            placeholder="My Query"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                            }}
                            autoFocus
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="What does this query do?"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value)
                            }}
                            rows={3}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                            id="tags"
                            placeholder="analytics, reports, users (comma separated)"
                            value={tags}
                            onChange={(e) => {
                                setTags(e.target.value)
                            }}
                        />
                    </div>

                    <div className="rounded-md bg-muted p-3">
                        <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                        <code className="block text-xs font-mono line-clamp-3">{query}</code>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                        }}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
                        {isSaving ? "Saving…" : "Save Query"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
