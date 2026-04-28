import { useEffect, useState } from "react"
import { toast } from "sonner"
import { type SavedQuery, usePlatform } from "../../contexts/PlatformContext"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { Skeleton } from "../ui/skeleton"
import { Clock, Database, Search, Tag, Trash2 } from "lucide-react"
import { useT } from "../../i18n"

export interface SavedQueriesProps {
    connectionId: string | null
    onLoadQuery?: (query: SavedQuery) => void
    /**
     * Bump this number to ask the panel to refetch from the platform — used
     * by the parent after a new query is saved so the list updates without a
     * full page reload.
     */
    refreshKey?: number
}

export function SavedQueries({
    connectionId,
    onLoadQuery,
    refreshKey,
}: SavedQueriesProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [queries, setQueries] = useState<SavedQuery[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!connectionId) {
            setQueries([])
            return
        }

        loadQueries()
    }, [connectionId, platform, refreshKey])

    const loadQueries = (): void => {
        if (!connectionId) {
            return
        }

        setIsLoading(true)
        platform
            .getSavedQueries(connectionId)
            .then((data) => {
                setQueries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to load saved queries:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const handleSearch = (): void => {
        if (!connectionId || !searchQuery.trim()) {
            return
        }

        setIsLoading(true)
        platform
            .searchSavedQueries(connectionId, searchQuery)
            .then((data) => {
                setQueries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to search saved queries:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const handleClearSearch = (): void => {
        setSearchQuery("")
        setSelectedTag(null)
        loadQueries()
    }

    const handleDelete = (id: number): void => {
        platform
            .deleteSavedQuery(id)
            .then(() => {
                setQueries((prev) => prev.filter((q) => q.id !== id))
            })
            .catch((err: unknown) => {
                console.error("Failed to delete saved query:", err)
                toast.error(t("savedQueries.deleteFailed"), {
                    description: err instanceof Error ? err.message : t("common.unknownError"),
                })
            })
    }

    const handleTagClick = (tag: string): void => {
        if (!connectionId) {
            return
        }

        setSelectedTag(tag)
        setIsLoading(true)
        platform
            .getSavedQueriesByTag(connectionId, tag)
            .then((data) => {
                setQueries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to filter by tag:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const formatTimestamp = (timestamp: string): string => {
        const date = new Date(timestamp)
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }

    const parseTags = (tags?: string): string[] => {
        if (!tags) {
            return []
        }
        return tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b p-4">
                <div className="flex flex-1 items-center gap-2">
                    <Input
                        placeholder={t("savedQueries.searchPlaceholder")}
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
                    {(searchQuery || selectedTag) && (
                        <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                            {t("savedQueries.clear")}
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
            </div>

            {selectedTag && (
                <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
                    <Tag className="h-3 w-3" />
                    <span className="text-sm">
                        {t("savedQueries.filteredByTag", { tag: selectedTag })}
                    </span>
                </div>
            )}

            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-[76px] w-full" />
                        ))}
                    </div>
                ) : queries.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                        {searchQuery || selectedTag
                            ? t("savedQueries.emptyNoMatch")
                            : t("savedQueries.emptyAll")}
                    </div>
                ) : (
                    <div className="space-y-2 p-4">
                        {queries.map((query) => (
                            <div
                                key={query.id}
                                className="group relative rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <h3 className="font-medium">{query.name}</h3>
                                        {query.description && (
                                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                                {query.description}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t("savedQueries.deleteAria")}
                                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => {
                                            handleDelete(query.id)
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>

                                <button
                                    className="w-full text-left"
                                    onClick={() => {
                                        if (onLoadQuery) {
                                            onLoadQuery(query)
                                        }
                                    }}
                                    type="button"
                                >
                                    <code className="block rounded bg-muted px-2 py-1 text-sm font-mono line-clamp-2">
                                        {query.query}
                                    </code>
                                </button>

                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimestamp(query.createdAt)}
                                    </div>
                                    {query.databaseName && (
                                        <div className="flex items-center gap-1">
                                            <Database className="h-3 w-3" />
                                            {query.databaseName}
                                            {query.collectionName && ` / ${query.collectionName}`}
                                        </div>
                                    )}
                                    <Badge variant="outline">{query.language}</Badge>
                                </div>

                                {query.tags && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {parseTags(query.tags).map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="cursor-pointer text-xs"
                                                onClick={() => {
                                                    handleTagClick(tag)
                                                }}
                                            >
                                                <Tag className="mr-1 h-2 w-2" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
