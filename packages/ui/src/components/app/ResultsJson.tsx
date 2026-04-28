import { Braces, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { EmptyState } from "../ui/empty-state"
import { ScrollArea } from "../ui/scroll-area"
import type { ResultDocument } from "../../contexts/PlatformContext"

export interface ResultsJsonProps {
    documents: ResultDocument[]
}

/**
 * JSON view for query results.
 * Displays prettified JSON with syntax highlighting.
 */
export function ResultsJson({ documents }: ResultsJsonProps): JSX.Element {
    const jsonString = JSON.stringify(documents, null, 4)
    const [justCopied, setJustCopied] = useState(false)

    const handleCopy = (): void => {
        navigator.clipboard
            .writeText(jsonString)
            .then(() => {
                setJustCopied(true)
                toast.success("Copied to clipboard", {
                    description: `${documents.length} ${
                        documents.length === 1 ? "document" : "documents"
                    } as JSON`,
                })
                setTimeout(() => {
                    setJustCopied(false)
                }, 1500)
            })
            .catch((err: unknown) => {
                console.error("Failed to copy JSON:", err)
                toast.error("Could not copy JSON", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
            })
    }

    if (documents.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <EmptyState
                    icon={<Braces className="h-5 w-5" />}
                    title="No documents"
                    description="There is nothing to render as JSON. Adjust the query and re-run."
                />
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
                    {documents.length} {documents.length === 1 ? "document" : "documents"}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    aria-label="Copy result as JSON"
                    className="gap-2"
                >
                    <Copy className="h-4 w-4" />
                    {justCopied ? "Copied" : "Copy JSON"}
                </Button>
            </div>
            <ScrollArea className="flex-1 rounded-md border border-[var(--border)] bg-[var(--card)]/40">
                <pre className="p-4 text-xs">
                    <code className="language-json">{highlightJson(jsonString)}</code>
                </pre>
            </ScrollArea>
        </div>
    )
}

/**
 * Simple JSON syntax highlighting.
 *
 * Walks the split tokens once and tracks the running offset into `json`,
 * so deciding whether a string is a key or a value is a single character
 * lookup at a known position. The previous version called
 * `json.indexOf(part)` per string, which was O(n·m) and — worse —
 * misclassified value strings that happened to equal an earlier key
 * (indexOf always returns the *first* match).
 */
function highlightJson(json: string): JSX.Element {
    const parts = json.split(
        /("(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    )

    let offset = 0
    return (
        <>
            {parts.map((part, index) => {
                const startedAt = offset
                offset += part.length

                if (!part) {
                    return null
                }

                // String
                if (part.startsWith('"')) {
                    const isKey = json[startedAt + part.length] === ":"
                    return (
                        <span key={index} className={isKey ? "syntax-property" : "syntax-string"}>
                            {part}
                        </span>
                    )
                }

                // Boolean or null
                if (["true", "false", "null"].includes(part)) {
                    return (
                        <span
                            key={index}
                            className={part === "null" ? "syntax-null" : "syntax-boolean"}
                        >
                            {part}
                        </span>
                    )
                }

                // Number
                if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(part)) {
                    return (
                        <span key={index} className="syntax-number">
                            {part}
                        </span>
                    )
                }

                // Default (punctuation, whitespace)
                return <span key={index}>{part}</span>
            })}
        </>
    )
}
