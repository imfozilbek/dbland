import { useEffect, useState } from "react"
import { type QueryHistoryEntry, usePlatform } from "../../contexts/PlatformContext"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { CheckCircle, Clock, Database, Search, Trash2, XCircle } from "lucide-react"

export interface QueryHistoryProps {
    connectionId: string | null
    onLoadQuery?: (query: string) => void
}

export function QueryHistory({ connectionId, onLoadQuery }: QueryHistoryProps): JSX.Element {
    const platform = usePlatform()
    const [entries, setEntries] = useState<QueryHistoryEntry[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!connectionId) {
            setEntries([])
            return
        }

        setIsLoading(true)
        platform
            .getQueryHistory(connectionId)
            .then((data) => {
                setEntries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to load query history:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [connectionId, platform])

    const handleSearch = (): void => {
        if (!connectionId || !searchQuery.trim()) {
            return
        }

        setIsLoading(true)
        platform
            .searchQueryHistory(connectionId, searchQuery)
            .then((data) => {
                setEntries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to search query history:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const handleClearSearch = (): void => {
        setSearchQuery("")
        if (!connectionId) {
            return
        }

        setIsLoading(true)
        platform
            .getQueryHistory(connectionId)
            .then((data) => {
                setEntries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to load query history:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const handleDelete = (id: number): void => {
        platform
            .deleteQueryHistory(id)
            .then(() => {
                setEntries((prev) => prev.filter((entry) => entry.id !== id))
            })
            .catch((err: unknown) => {
                console.error("Failed to delete query history:", err)
            })
    }

    const handleClearAll = (): void => {
        if (!connectionId) {
            return
        }

        // TODO: Replace with proper confirmation dialog
        // eslint-disable-next-line no-alert
        if (!confirm("Clear all query history for this connection?")) {
            return
        }

        platform
            .clearQueryHistory(connectionId)
            .then(() => {
                setEntries([])
            })
            .catch((err: unknown) => {
                console.error("Failed to clear query history:", err)
            })
    }

    const formatTimestamp = (timestamp: string): string => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) {
            return "Just now"
        }
        if (diffMins < 60) {
            return `${diffMins}m ago`
        }
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) {
            return `${diffHours}h ago`
        }
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}d ago`
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b p-4">
                <div className="flex flex-1 items-center gap-2">
                    <Input
                        placeholder="Search query history..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch()
                            }
                        }}
                        className="flex-1"
                    />
                    {searchQuery && (
                        <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                            Clear
                        </Button>
                    )}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSearch}
                        disabled={!searchQuery.trim()}
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={entries.length === 0}
                >
                    Clear All
                </Button>
            </div>

            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                        Loading...
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                        {searchQuery ? "No matching queries found" : "No query history"}
                    </div>
                ) : (
                    <div className="space-y-2 p-4">
                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="group relative rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {entry.success ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <Badge variant="outline">{entry.language}</Badge>
                                        {entry.databaseName && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Database className="h-3 w-3" />
                                                {entry.databaseName}
                                                {entry.collectionName &&
                                                    ` / ${entry.collectionName}`}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => {
                                            handleDelete(entry.id)
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>

                                <button
                                    className="w-full text-left"
                                    onClick={() => {
                                        if (onLoadQuery) {
                                            onLoadQuery(entry.query)
                                        }
                                    }}
                                    type="button"
                                >
                                    <code className="block rounded bg-muted px-2 py-1 text-sm font-mono line-clamp-3">
                                        {entry.query}
                                    </code>
                                </button>

                                {entry.error && (
                                    <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-950">
                                        {entry.error}
                                    </div>
                                )}

                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimestamp(entry.executedAt)}
                                    </div>
                                    <div>{entry.executionTimeMs}ms</div>
                                    {entry.resultCount > 0 && (
                                        <div>{entry.resultCount} results</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
