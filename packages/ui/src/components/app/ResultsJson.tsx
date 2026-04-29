import { Braces, Copy } from "lucide-react"
import { extractErrorMessage } from "@dbland/core"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { EmptyState } from "../ui/empty-state"
import { ScrollArea } from "../ui/scroll-area"
import type { ResultDocument } from "../../contexts/PlatformContext"

export interface ResultsJsonProps {
    documents: ResultDocument[]
}

/**
 * How long the "Copied" badge stays on the button after a successful
 * copy. Long enough to be noticed, short enough not to feel sticky.
 */
const COPIED_FEEDBACK_MS = 1500

/**
 * JSON view for query results.
 * Displays prettified JSON with syntax highlighting.
 */
export function ResultsJson({ documents }: ResultsJsonProps): JSX.Element {
    const jsonString = JSON.stringify(documents, null, 4)
    const [justCopied, setJustCopied] = useState(false)
    // Tracks the in-flight "Copied" timer so quick repeated clicks
    // cancel the previous timer before scheduling a new one — without
    // this, two clicks within 1.5s scheduled two setState calls and
    // the second one collapsed the badge sooner than the user expected.
    // Also lets the unmount cleanup cancel a pending setState that
    // would otherwise fire against a torn-down component.
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (copiedTimerRef.current !== null) {
                clearTimeout(copiedTimerRef.current)
            }
        }
    }, [])

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
                if (copiedTimerRef.current !== null) {
                    clearTimeout(copiedTimerRef.current)
                }
                copiedTimerRef.current = setTimeout(() => {
                    setJustCopied(false)
                    copiedTimerRef.current = null
                }, COPIED_FEEDBACK_MS)
            })
            .catch((err: unknown) => {
                console.error("Failed to copy JSON:", err)
                toast.error("Could not copy JSON", {
                    description: extractErrorMessage(err) || "Unknown error",
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
