import { useState } from "react"
import { toast } from "sonner"
import {
    type AggregationPipelineStage,
    type AggregationResult,
    usePlatform,
} from "../../contexts/PlatformContext"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Code2, Play, SlidersHorizontal } from "lucide-react"
import { EmptyState } from "../ui/empty-state"
import { PipelineCanvas } from "./PipelineCanvas"
import { StageLibrary } from "./StageLibrary"
import { StageEditor } from "./StageEditor"
import { StagePreview } from "./StagePreview"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"
import { useT } from "../../i18n"

export interface AggregationBuilderProps {
    connectionId: string
    databaseName: string
    collectionName: string
}

export function AggregationBuilder({
    connectionId,
    databaseName,
    collectionName,
}: AggregationBuilderProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [pipeline, setPipeline] = useState<AggregationPipelineStage[]>([])
    const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null)
    const [isExecuting, setIsExecuting] = useState(false)
    const [result, setResult] = useState<AggregationResult | null>(null)
    const [previewResult, setPreviewResult] = useState<AggregationResult | null>(null)
    const [showCode, setShowCode] = useState(false)

    const handleAddStage = (stageType: string): void => {
        const newStage: AggregationPipelineStage = {
            stageType,
            stageData: {},
        }
        setPipeline([...pipeline, newStage])
        setSelectedStageIndex(pipeline.length)
    }

    const handleUpdateStage = (index: number, stage: AggregationPipelineStage): void => {
        const updated = [...pipeline]
        updated[index] = stage
        setPipeline(updated)
    }

    const handleRemoveStage = (index: number): void => {
        const updated = pipeline.filter((_, i) => i !== index)
        setPipeline(updated)
        if (selectedStageIndex === index) {
            setSelectedStageIndex(null)
        }
    }

    const handleReorderStages = (newPipeline: AggregationPipelineStage[]): void => {
        setPipeline(newPipeline)
    }

    const handleExecutePipeline = (): void => {
        setIsExecuting(true)
        platform
            .executeAggregationPipeline({
                connectionId,
                databaseName,
                collectionName,
                pipeline,
            })
            .then((res) => {
                setResult(res)
            })
            .catch((err: unknown) => {
                console.error("Failed to execute pipeline:", err)
                setResult({
                    success: false,
                    documents: [],
                    executionTimeMs: 0,
                    documentsReturned: 0,
                    error:
                        err instanceof Error
                            ? err.message
                            : t("aggregationBuilder.executionFailed"),
                })
            })
            .finally(() => {
                setIsExecuting(false)
            })
    }

    const handlePreviewStage = (stageIndex: number): void => {
        platform
            .previewPipelineStage({
                connectionId,
                databaseName,
                collectionName,
                pipeline,
                stageIndex,
                limit: 10,
            })
            .then((res) => {
                setPreviewResult(res)
            })
            .catch((err: unknown) => {
                // Without a visible signal, clicking Preview on a malformed
                // stage (or against an unreachable database) looked
                // identical to a slow request — the user just waited.
                console.error("Failed to preview stage:", err)
                toast.error(t("aggregationBuilder.previewFailed"), {
                    description: err instanceof Error ? err.message : t("common.unknownError"),
                })
            })
    }

    const generateCode = (): string => {
        const stages = pipeline.map((stage) => {
            return `  { $${stage.stageType}: ${JSON.stringify(stage.stageData, null, 2).replace(/\n/g, "\n    ")} }`
        })
        return `db.${collectionName}.aggregate([\n${stages.join(",\n")}\n])`
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{t("aggregationBuilder.title")}</h2>
                    <span className="text-sm text-muted-foreground">
                        {databaseName}.{collectionName}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            setShowCode(!showCode)
                        }}
                    >
                        <Code2 className="h-4 w-4" />
                        {showCode
                            ? t("aggregationBuilder.hideCode")
                            : t("aggregationBuilder.showCode")}
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={handleExecutePipeline}
                        disabled={isExecuting || pipeline.length === 0}
                    >
                        <Play className="h-4 w-4" />
                        {isExecuting
                            ? t("aggregationBuilder.running")
                            : t("aggregationBuilder.runPipeline")}
                    </Button>
                </div>
            </div>

            <ResizablePanelGroup orientation="horizontal" className="flex-1">
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <StageLibrary onAddStage={handleAddStage} />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex h-full flex-col">
                        {showCode ? (
                            <ScrollArea className="flex-1 p-4">
                                <pre className="rounded-md bg-muted p-4 text-sm font-mono">
                                    {generateCode()}
                                </pre>
                            </ScrollArea>
                        ) : (
                            <PipelineCanvas
                                pipeline={pipeline}
                                selectedStageIndex={selectedStageIndex}
                                onSelectStage={setSelectedStageIndex}
                                onReorderStages={handleReorderStages}
                                onRemoveStage={handleRemoveStage}
                                onPreviewStage={handlePreviewStage}
                            />
                        )}

                        {result && (
                            <Card className="m-2 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">
                                            {t("aggregationBuilder.resultsHeading", {
                                                count: result.documentsReturned,
                                            })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {t("aggregationBuilder.executionTime", {
                                                ms: result.executionTimeMs,
                                            })}
                                        </span>
                                    </div>
                                    {result.error && (
                                        <span className="text-sm text-[var(--destructive)]">
                                            {result.error}
                                        </span>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                    <div className="flex h-full flex-col">
                        {selectedStageIndex !== null && pipeline[selectedStageIndex] ? (
                            <StageEditor
                                stage={pipeline[selectedStageIndex]}
                                onUpdate={(updated) => {
                                    handleUpdateStage(selectedStageIndex, updated)
                                }}
                            />
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyState
                                    icon={<SlidersHorizontal className="h-5 w-5" />}
                                    title={t("aggregationBuilder.emptySelectionTitle")}
                                    description={
                                        pipeline.length === 0
                                            ? t("aggregationBuilder.emptySelectionAddFirst")
                                            : t("aggregationBuilder.emptySelectionPickOne")
                                    }
                                />
                            </div>
                        )}

                        {previewResult && (
                            <StagePreview
                                result={previewResult}
                                onClose={() => {
                                    setPreviewResult(null)
                                }}
                            />
                        )}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
