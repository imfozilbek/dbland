import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { X } from "lucide-react"
import type { AggregationResult } from "../../contexts/PlatformContext"
import { useT } from "../../i18n"

export interface StagePreviewProps {
    result: AggregationResult
    onClose: () => void
}

export function StagePreview({ result, onClose }: StagePreviewProps): JSX.Element {
    const t = useT()
    return (
        <div className="flex h-full flex-col border-t">
            <div className="flex items-center justify-between border-b p-3">
                <div>
                    <h3 className="text-sm font-semibold">
                        {t("aggregationBuilder.preview.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {t("aggregationBuilder.preview.documentsAndTime", {
                            count: result.documentsReturned,
                            ms: result.executionTimeMs,
                        })}
                    </p>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={t("aggregationBuilder.preview.closeAriaLabel")}
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {result.error ? (
                        <Card className="border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
                            <strong>{t("aggregationBuilder.preview.errorPrefix")}</strong>{" "}
                            {result.error}
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
