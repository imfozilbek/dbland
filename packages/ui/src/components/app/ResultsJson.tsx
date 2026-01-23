import { Copy } from "lucide-react"
import { Button } from "../ui/button"
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

    const handleCopy = (): void => {
        navigator.clipboard
            .writeText(jsonString)
            .then(() => {
                // Success
            })
            .catch((err: unknown) => {
                console.error("Failed to copy JSON:", err)
            })
    }

    if (documents.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                No documents found
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy JSON
                </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-md bg-muted/30">
                <pre className="p-4 text-xs">
                    <code className="language-json">{highlightJson(jsonString)}</code>
                </pre>
            </ScrollArea>
        </div>
    )
}

/**
 * Simple JSON syntax highlighting
 */
function highlightJson(json: string): JSX.Element {
    const parts = json.split(
        /("(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    )

    return (
        <>
            {parts.map((part, index) => {
                if (!part) {
                    return null
                }

                // String
                if (part.startsWith('"')) {
                    const isKey = json[json.indexOf(part) + part.length] === ":"
                    return (
                        <span key={index} className={isKey ? "text-blue-400" : "text-green-400"}>
                            {part}
                        </span>
                    )
                }

                // Boolean or null
                if (["true", "false", "null"].includes(part)) {
                    return (
                        <span key={index} className="text-purple-400">
                            {part}
                        </span>
                    )
                }

                // Number
                if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(part)) {
                    return (
                        <span key={index} className="text-orange-400">
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
