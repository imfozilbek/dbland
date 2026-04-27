import * as React from "react"
import { useState } from "react"
import { type ResultDocument, usePlatform } from "../../contexts/PlatformContext"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { ScrollArea } from "../ui/scroll-area"

export interface DocumentEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectionId: string
    databaseName: string
    collectionName: string
    documentId: string
    onSaved?: () => void
}

export function DocumentEditorDialog({
    open,
    onOpenChange,
    connectionId,
    databaseName,
    collectionName,
    documentId,
    onSaved,
}: DocumentEditorDialogProps): JSX.Element {
    const platform = usePlatform()
    const [document, setDocument] = useState<ResultDocument | null>(null)
    const [jsonContent, setJsonContent] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    React.useEffect(() => {
        if (open && documentId) {
            loadDocument()
        }
    }, [open, documentId])

    const loadDocument = (): void => {
        setIsLoading(true)
        setError(null)
        platform
            .getDocument(connectionId, databaseName, collectionName, documentId)
            .then((doc) => {
                setDocument(doc)
                setJsonContent(JSON.stringify(doc, null, 4))
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Failed to load document")
                console.error("Failed to load document:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const handleSaveJson = (): void => {
        try {
            const parsed = JSON.parse(jsonContent) as Record<string, unknown>
            handleSave(parsed)
        } catch (_err) {
            setError("Invalid JSON")
        }
    }

    const handleSave = (updates: Record<string, unknown>): void => {
        setIsSaving(true)
        setError(null)

        // Remove _id from updates as it shouldn't be modified
        const { _id, ...updateData } = updates

        platform
            .updateDocument(connectionId, databaseName, collectionName, documentId, updateData)
            .then((success) => {
                if (success) {
                    onOpenChange(false)
                    if (onSaved) {
                        onSaved()
                    }
                } else {
                    setError("Failed to update document")
                }
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Failed to save document")
                console.error("Failed to save document:", err)
            })
            .finally(() => {
                setIsSaving(false)
            })
    }

    const handleDelete = (): void => {
        // eslint-disable-next-line no-alert
        if (!confirm("Are you sure you want to delete this document?")) {
            return
        }

        platform
            .deleteDocument(connectionId, databaseName, collectionName, documentId)
            .then((success) => {
                if (success) {
                    onOpenChange(false)
                    if (onSaved) {
                        onSaved()
                    }
                }
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Failed to delete document")
                console.error("Failed to delete document:", err)
            })
    }

    const handleClone = (): void => {
        platform
            .cloneDocument(connectionId, databaseName, collectionName, documentId)
            .then(() => {
                onOpenChange(false)
                if (onSaved) {
                    onSaved()
                }
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Failed to clone document")
                console.error("Failed to clone document:", err)
            })
    }

    const renderFormEditor = (): JSX.Element => {
        if (!document) {
            return <div>No document loaded</div>
        }

        return (
            <ScrollArea className="h-[400px]">
                <div className="space-y-4 p-4">
                    {Object.entries(document).map(([key, value]) => (
                        <div key={key} className="grid gap-2">
                            <Label htmlFor={key}>{key}</Label>
                            {key === "_id" ? (
                                <Input id={key} value={String(value)} disabled />
                            ) : typeof value === "object" ? (
                                <Textarea
                                    id={key}
                                    value={JSON.stringify(value, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            const parsed: unknown = JSON.parse(e.target.value)
                                            setDocument({ ...document, [key]: parsed })
                                        } catch {
                                            // Invalid JSON, keep as string for now
                                        }
                                    }}
                                    rows={5}
                                />
                            ) : (
                                <Input
                                    id={key}
                                    value={
                                        typeof value === "object" && value !== null
                                            ? JSON.stringify(value)
                                            : // eslint-disable-next-line @typescript-eslint/no-base-to-string
                                              String(value)
                                    }
                                    onChange={(e) => {
                                        setDocument({ ...document, [key]: e.target.value })
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Edit Document</DialogTitle>
                    <DialogDescription>
                        {databaseName} / {collectionName}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center p-8">Loading...</div>
                ) : (
                    <Tabs defaultValue="form" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="form">Form</TabsTrigger>
                            <TabsTrigger value="json">JSON</TabsTrigger>
                        </TabsList>

                        <TabsContent value="form" className="mt-4">
                            {renderFormEditor()}
                        </TabsContent>

                        <TabsContent value="json" className="mt-4">
                            <Textarea
                                value={jsonContent}
                                onChange={(e) => {
                                    setJsonContent(e.target.value)
                                }}
                                rows={20}
                                className="font-mono text-sm"
                            />
                        </TabsContent>
                    </Tabs>
                )}

                <DialogFooter className="flex justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSaving || isLoading}
                        >
                            Delete
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClone}
                            disabled={isSaving || isLoading}
                        >
                            Clone
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false)
                            }}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (document) {
                                    handleSave(document)
                                } else {
                                    handleSaveJson()
                                }
                            }}
                            disabled={isSaving || isLoading}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
