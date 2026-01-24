
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { X } from "lucide-react"
import type { AggregationResult } from "../../contexts/PlatformContext"

export interface StagePreviewProps {
    result: AggregationResult
    onClose: () => void
}

export function StagePreview({ result, onClose }: StagePreviewProps): JSX.Element {
    return (
        <div className="flex h-full flex-col border-t">
            <div className="flex items-center justify-between border-b p-3">
                <div>
                    <h3 className="text-sm font-semibold">Stage Preview</h3>
                    <p className="text-xs text-muted-foreground">
                        {result.documentsReturned} documents ({result.executionTimeMs}ms)
                    </p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {result.error ? (
                        <Card className="bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">
                            <strong>Error:</strong> {result.error}
                        </Card>
                    ) : (
                        <pre className="text-xs font-mono">
                            {JSON.stringify(result.documents, null, 2)}
                        </pre>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
