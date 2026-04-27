import { ChevronDown, ChevronRight, FolderTree } from "lucide-react"
import { useState } from "react"
import { EmptyState } from "../ui/empty-state"
import { ScrollArea } from "../ui/scroll-area"
import type { ResultDocument } from "../../contexts/PlatformContext"

export interface ResultsTreeProps {
    documents: ResultDocument[]
}

/**
 * Tree view for query results.
 * Displays documents in a collapsible tree structure.
 */
export function ResultsTree({ documents }: ResultsTreeProps): JSX.Element {
    if (documents.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <EmptyState
                    icon={<FolderTree className="h-5 w-5" />}
                    title="No documents"
                    description="The result set is empty — nothing to expand. Adjust the query and re-run."
                />
            </div>
        )
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-2">
                {documents.map((doc, index) => (
                    <TreeNode key={index} label={`Document ${index + 1}`} value={doc} />
                ))}
            </div>
        </ScrollArea>
    )
}

interface TreeNodeProps {
    label: string
    value: unknown
    level?: number
}

function TreeNode({ label, value, level = 0 }: TreeNodeProps): JSX.Element {
    const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels

    const paddingLeft = `${level * 20}px`

    // Null/undefined
    if (value === null || value === undefined) {
        return (
            <div style={{ paddingLeft }} className="py-1 text-sm font-mono">
                <span className="syntax-property">{label}</span>
                <span className="text-muted-foreground">: </span>
                <span className="syntax-null">{value === null ? "null" : "undefined"}</span>
            </div>
        )
    }

    // Boolean
    if (typeof value === "boolean") {
        return (
            <div style={{ paddingLeft }} className="py-1 text-sm font-mono">
                <span className="syntax-property">{label}</span>
                <span className="text-muted-foreground">: </span>
                <span className="syntax-boolean">{String(value)}</span>
            </div>
        )
    }

    // Number
    if (typeof value === "number") {
        return (
            <div style={{ paddingLeft }} className="py-1 text-sm font-mono">
                <span className="syntax-property">{label}</span>
                <span className="text-muted-foreground">: </span>
                <span className="syntax-number">{value}</span>
            </div>
        )
    }

    // String
    if (typeof value === "string") {
        return (
            <div style={{ paddingLeft }} className="py-1 text-sm font-mono">
                <span className="syntax-property">{label}</span>
                <span className="text-muted-foreground">: </span>
                <span className="syntax-string">&quot;{value}&quot;</span>
            </div>
        )
    }

    // Array
    if (Array.isArray(value)) {
        return (
            <div>
                <div
                    style={{ paddingLeft }}
                    className="py-1 text-sm font-mono cursor-pointer hover:bg-muted/50 flex items-center gap-1"
                    onClick={() => {
                        setIsExpanded(!isExpanded)
                    }}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="syntax-property">{label}</span>
                    <span className="text-muted-foreground">: [</span>
                    <span className="text-muted-foreground text-xs">{value.length} items</span>
                    <span className="text-muted-foreground">]</span>
                </div>
                {isExpanded &&
                    (value as unknown[]).map((item: unknown, index) => (
                        <TreeNode key={index} label={`[${index}]`} value={item} level={level + 1} />
                    ))}
            </div>
        )
    }

    // Object
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
        return (
            <div>
                <div
                    style={{ paddingLeft }}
                    className="py-1 text-sm font-mono cursor-pointer hover:bg-muted/50 flex items-center gap-1"
                    onClick={() => {
                        setIsExpanded(!isExpanded)
                    }}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="syntax-property">{label}</span>
                    <span className="text-muted-foreground">: {"{"}</span>
                    <span className="text-muted-foreground text-xs">
                        {entries.length} properties
                    </span>
                    <span className="text-muted-foreground">{"}"}</span>
                </div>
                {isExpanded &&
                    entries.map(([key, val]) => (
                        <TreeNode key={key} label={key} value={val} level={level + 1} />
                    ))}
            </div>
        )
    }

    // Fallback - safe to convert to string here as all other types are handled above
    return (
        <div style={{ paddingLeft }} className="py-1 text-sm font-mono">
            <span className="syntax-property">{label}</span>
            <span className="text-muted-foreground">: </span>
            {/* eslint-disable-next-line @typescript-eslint/no-base-to-string */}
            <span className="syntax-value">{String(value)}</span>
        </div>
    )
}
