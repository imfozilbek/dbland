import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef } from "react"
import type { ResultDocument } from "../../contexts/PlatformContext"
import { cn } from "../../lib/utils"
import { ScrollArea } from "../ui/scroll-area"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "../ui/context-menu"
import { EmptyState } from "../ui/empty-state"
import { Copy, Edit, Inbox, Trash2 } from "lucide-react"

export interface ResultsTableProps {
    documents: ResultDocument[]
    onEditDocument?: (documentId: string) => void
    onCloneDocument?: (documentId: string) => void
    onDeleteDocument?: (documentId: string) => void
}

/**
 * Virtualized table view for query results.
 * Efficiently renders large datasets using react-virtual.
 */
export function ResultsTable({
    documents,
    onEditDocument,
    onCloneDocument,
    onDeleteDocument,
}: ResultsTableProps): JSX.Element {
    const parentRef = useRef<HTMLDivElement>(null)

    const getDocumentId = (doc: ResultDocument): string | null => {
        if (doc._id) {
            if (typeof doc._id === "string") {
                return doc._id
            }
            if (typeof doc._id === "object" && doc._id !== null && "$oid" in doc._id) {
                return (doc._id as { $oid: string }).$oid
            }
        }
        return null
    }

    if (documents.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <EmptyState
                    icon={<Inbox className="h-5 w-5" />}
                    title="No documents"
                    description="The query ran successfully but the result set is empty. Adjust the filter or check the collection."
                />
            </div>
        )
    }

    // Extract all unique column names from documents
    const columns = Array.from(new Set(documents.flatMap((doc) => Object.keys(doc))))

    // Virtualize rows for performance
    const rowVirtualizer = useVirtualizer({
        count: documents.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 10,
    })

    return (
        <ScrollArea ref={parentRef} className="h-full">
            <div className="relative">
                {/* Header */}
                <div
                    role="row"
                    className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--popover)] backdrop-blur supports-[backdrop-filter]:bg-[var(--popover)]/85"
                >
                    <div className="flex">
                        <div className="w-12 border-r border-[var(--border)] px-2 py-2 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                            #
                        </div>
                        {columns.map((column) => (
                            <div
                                key={column}
                                className="min-w-[150px] border-r border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] last:border-r-0"
                            >
                                {column}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Virtual rows */}
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const doc = documents[virtualRow.index]
                        const docId = getDocumentId(doc)
                        const isZebra = virtualRow.index % 2 === 1
                        const rowContent = (
                            <div
                                key={virtualRow.key}
                                role="row"
                                aria-rowindex={virtualRow.index + 1}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                className={cn(
                                    "flex transition-colors duration-150 hover:bg-[var(--accent)]/60",
                                    isZebra && "bg-[var(--card)]/40",
                                )}
                            >
                                <div className="w-12 border-r border-b border-[var(--border)] px-2 py-2 text-right font-mono text-[10px] tabular-nums text-[var(--muted-foreground)]/70">
                                    {virtualRow.index + 1}
                                </div>
                                {columns.map((column) => (
                                    <div
                                        key={column}
                                        className="min-w-[150px] truncate border-r border-b border-[var(--border)] px-3 py-2 font-mono text-xs last:border-r-0"
                                        title={formatCellValue(doc[column])}
                                    >
                                        {renderCellValue(doc[column])}
                                    </div>
                                ))}
                            </div>
                        )

                        if (docId && (onEditDocument || onCloneDocument || onDeleteDocument)) {
                            return (
                                <ContextMenu key={virtualRow.key}>
                                    <ContextMenuTrigger asChild>{rowContent}</ContextMenuTrigger>
                                    <ContextMenuContent>
                                        {onEditDocument && (
                                            <ContextMenuItem
                                                onClick={() => {
                                                    onEditDocument(docId)
                                                }}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </ContextMenuItem>
                                        )}
                                        {onCloneDocument && (
                                            <ContextMenuItem
                                                onClick={() => {
                                                    onCloneDocument(docId)
                                                }}
                                            >
                                                <Copy className="mr-2 h-4 w-4" />
                                                Clone
                                            </ContextMenuItem>
                                        )}
                                        {onDeleteDocument && (
                                            <ContextMenuItem
                                                onClick={() => {
                                                    onDeleteDocument(docId)
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                            )
                        }

                        return rowContent
                    })}
                </div>
            </div>
        </ScrollArea>
    )
}

function formatCellValue(value: unknown): string {
    if (value === null) {
        return "null"
    }
    if (value === undefined) {
        return "undefined"
    }
    if (typeof value === "object") {
        try {
            return JSON.stringify(value)
        } catch {
            return "[Object]"
        }
    }
    // Safe to convert primitives to string
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(value)
}

function renderCellValue(value: unknown): JSX.Element {
    if (value === null) {
        return <span className="text-muted-foreground italic">null</span>
    }
    if (value === undefined) {
        return <span className="text-muted-foreground italic">undefined</span>
    }
    if (typeof value === "boolean") {
        return <span className="syntax-boolean">{String(value)}</span>
    }
    if (typeof value === "number") {
        return <span className="syntax-number">{value}</span>
    }
    if (typeof value === "string") {
        return <span className="syntax-string">{value}</span>
    }
    if (typeof value === "object") {
        try {
            return <span className="syntax-property">{JSON.stringify(value)}</span>
        } catch {
            return <span className="syntax-property">[Object]</span>
        }
    }
    // Safe to convert primitives to string
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return <span>{String(value)}</span>
}
