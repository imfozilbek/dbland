import { useEffect, useState } from "react"
import { Lightbulb } from "lucide-react"
import { Card } from "../ui/card"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import type { AggregationPipelineStage } from "../../contexts/PlatformContext"
import { useT } from "../../i18n"

/**
 * Per-stage example payloads that ship next to the JSON editor as a hint
 * the user can copy from. Previously only four stages had examples and the
 * card would render empty for the rest, including the "Examples:" header.
 */
const STAGE_EXAMPLES: Record<string, unknown> = {
    match: { status: "active" },
    group: { _id: "$category", total: { $sum: "$amount" } },
    project: { name: 1, email: 1, _id: 0 },
    sort: { createdAt: -1 },
    limit: 10,
    skip: 20,
    count: "documentCount",
    unwind: "$tags",
    lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
    },
    addFields: {
        fullName: { $concat: ["$firstName", " ", "$lastName"] },
    },
}

export interface StageEditorProps {
    stage: AggregationPipelineStage
    onUpdate: (stage: AggregationPipelineStage) => void
}

export function StageEditor({ stage, onUpdate }: StageEditorProps): JSX.Element {
    const t = useT()
    const stageDataJson = JSON.stringify(stage.stageData, null, 2)
    const [jsonContent, setJsonContent] = useState(stageDataJson)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setJsonContent(JSON.stringify(stage.stageData, null, 2))
        setError(null)
    }, [stage])

    // If the textarea no longer matches the saved stageData, the user has
    // pending edits — surface that so the Apply button isn't a no-op (or,
    // worse, the user doesn't realise their edits weren't applied yet).
    const hasUnsavedChanges = jsonContent !== stageDataJson

    const handleSave = (): void => {
        try {
            const parsed = JSON.parse(jsonContent) as Record<string, unknown>
            onUpdate({
                ...stage,
                stageData: parsed,
            })
            setError(null)
        } catch (_err) {
            setError(t("aggregationBuilder.editor.invalidJson"))
        }
    }

    const renderSimpleEditor = (): JSX.Element | null => {
        switch (stage.stageType) {
            case "limit":
            case "skip":
                return (
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="count">
                                {t("aggregationBuilder.editor.countLabel")}
                            </Label>
                            <Input
                                id="count"
                                type="number"
                                value={typeof stage.stageData === "number" ? stage.stageData : ""}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value, 10)
                                    if (!isNaN(value)) {
                                        onUpdate({
                                            ...stage,
                                            stageData: value,
                                        })
                                    }
                                }}
                                placeholder={t("aggregationBuilder.editor.countPlaceholder")}
                            />
                        </div>
                    </div>
                )

            case "count":
                return (
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="field">
                                {t("aggregationBuilder.editor.outputFieldLabel")}
                            </Label>
                            <Input
                                id="field"
                                value={
                                    typeof stage.stageData === "string" ? stage.stageData : "count"
                                }
                                onChange={(e) => {
                                    onUpdate({
                                        ...stage,
                                        stageData: e.target.value,
                                    })
                                }}
                                placeholder={t("aggregationBuilder.editor.outputFieldPlaceholder")}
                            />
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    const simpleEditor = renderSimpleEditor()
    const example = STAGE_EXAMPLES[stage.stageType]
    const exampleJson = example !== undefined ? JSON.stringify(example, null, 2) : null

    const handleUseExample = (): void => {
        if (exampleJson === null) {
            return
        }
        setJsonContent(exampleJson)
        setError(null)
    }

    return (
        <div className="flex h-full flex-col border-l border-[var(--border)]">
            <div className="border-b border-[var(--border)] p-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {t("aggregationBuilder.editor.title")}
                </h3>
                <p className="font-mono text-xs text-[var(--muted-foreground)]">
                    ${stage.stageType}
                </p>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                    {simpleEditor ?? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="stage-json">
                                    {t("aggregationBuilder.editor.jsonLabel")}
                                </Label>
                                <Textarea
                                    id="stage-json"
                                    value={jsonContent}
                                    onChange={(e) => {
                                        setJsonContent(e.target.value)
                                        setError(null)
                                    }}
                                    rows={15}
                                    className="font-mono text-sm"
                                    placeholder={t("aggregationBuilder.editor.jsonPlaceholder")}
                                    aria-invalid={error ? true : undefined}
                                    aria-describedby={error ? "stage-json-error" : undefined}
                                />
                            </div>

                            {error && (
                                <p
                                    id="stage-json-error"
                                    role="alert"
                                    className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
                                >
                                    {error}
                                </p>
                            )}

                            <Button
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges}
                                className="w-full"
                            >
                                {hasUnsavedChanges
                                    ? t("aggregationBuilder.editor.applyChanges")
                                    : t("aggregationBuilder.editor.noChanges")}
                            </Button>
                        </>
                    )}

                    {exampleJson !== null && (
                        <Card className="border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="h-3.5 w-3.5 text-[var(--primary)]" />
                                    <h4 className="text-xs font-semibold text-[var(--foreground)]">
                                        {t("aggregationBuilder.editor.exampleHeading")}
                                    </h4>
                                </div>
                                {!simpleEditor && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={handleUseExample}
                                    >
                                        {t("aggregationBuilder.editor.useExample")}
                                    </Button>
                                )}
                            </div>
                            <pre className="overflow-x-auto font-mono text-xs text-[var(--muted-foreground)]">
                                {exampleJson}
                            </pre>
                        </Card>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
