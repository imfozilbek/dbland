
import { useEffect, useState } from "react"
import { Card } from "../ui/card"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import type { AggregationPipelineStage } from "../../contexts/PlatformContext"

export interface StageEditorProps {
    stage: AggregationPipelineStage
    onUpdate: (stage: AggregationPipelineStage) => void
}

export function StageEditor({ stage, onUpdate }: StageEditorProps): JSX.Element {
    const [jsonContent, setJsonContent] = useState(JSON.stringify(stage.stageData, null, 2))
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setJsonContent(JSON.stringify(stage.stageData, null, 2))
        setError(null)
    }, [stage])

    const handleSave = (): void => {
        try {
            const parsed = JSON.parse(jsonContent)
            onUpdate({
                ...stage,
                stageData: parsed,
            })
            setError(null)
        } catch (_err) {
            setError("Invalid JSON")
        }
    }

    const renderSimpleEditor = (): JSX.Element | null => {
        switch (stage.stageType) {
            case "limit":
            case "skip":
                return (
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="count">Count</Label>
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
                                placeholder="Enter number"
                            />
                        </div>
                    </div>
                )

            case "count":
                return (
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="field">Output Field Name</Label>
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
                                placeholder="count"
                            />
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    const simpleEditor = renderSimpleEditor()

    return (
        <div className="flex h-full flex-col border-l">
            <div className="border-b p-3">
                <h3 className="text-sm font-semibold">Stage Editor</h3>
                <p className="text-xs text-muted-foreground font-mono">${stage.stageType}</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                    {simpleEditor || (
                        <>
                            <div>
                                <Label htmlFor="stage-json">Stage Configuration (JSON)</Label>
                                <Textarea
                                    id="stage-json"
                                    value={jsonContent}
                                    onChange={(e) => {
                                        setJsonContent(e.target.value)
                                        setError(null)
                                    }}
                                    rows={15}
                                    className="font-mono text-sm"
                                    placeholder='{"field": "value"}'
                                />
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <Button onClick={handleSave} className="w-full">
                                Apply Changes
                            </Button>
                        </>
                    )}

                    <Card className="bg-muted/50 p-3">
                        <h4 className="text-xs font-semibold mb-2">Examples:</h4>
                        <div className="space-y-2 text-xs font-mono">
                            {stage.stageType === "match" && (
                                <pre className="text-muted-foreground">
                                    {JSON.stringify({ status: "active" }, null, 2)}
                                </pre>
                            )}
                            {stage.stageType === "group" && (
                                <pre className="text-muted-foreground">
                                    {JSON.stringify(
                                        {
                                            _id: "$category",
                                            total: { $sum: "$amount" },
                                        },
                                        null,
                                        2,
                                    )}
                                </pre>
                            )}
                            {stage.stageType === "project" && (
                                <pre className="text-muted-foreground">
                                    {JSON.stringify({ name: 1, email: 1, _id: 0 }, null, 2)}
                                </pre>
                            )}
                            {stage.stageType === "sort" && (
                                <pre className="text-muted-foreground">
                                    {JSON.stringify({ createdAt: -1 }, null, 2)}
                                </pre>
                            )}
                        </div>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    )
}
