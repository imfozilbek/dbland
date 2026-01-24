import * as React from "react"
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { SortableStageCard } from "./SortableStageCard"
import { ScrollArea } from "../ui/scroll-area"
import type { AggregationPipelineStage } from "../../contexts/PlatformContext"

export interface PipelineCanvasProps {
    pipeline: AggregationPipelineStage[]
    selectedStageIndex: number | null
    onSelectStage: (index: number) => void
    onReorderStages: (pipeline: AggregationPipelineStage[]) => void
    onRemoveStage: (index: number) => void
    onPreviewStage: (index: number) => void
}

export function PipelineCanvas({
    pipeline,
    selectedStageIndex,
    onSelectStage,
    onReorderStages,
    onRemoveStage,
    onPreviewStage,
}: PipelineCanvasProps): JSX.Element {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    const handleDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = pipeline.findIndex((_, i) => `stage-${i}` === active.id)
            const newIndex = pipeline.findIndex((_, i) => `stage-${i}` === over.id)

            if (oldIndex !== -1 && newIndex !== -1) {
                onReorderStages(arrayMove(pipeline, oldIndex, newIndex))
            }
        }
    }

    if (pipeline.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center">
                <div>
                    <p className="text-lg font-semibold text-muted-foreground">
                        No stages in pipeline
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Click a stage from the library to add it
                    </p>
                </div>
            </div>
        )
    }

    return (
        <ScrollArea className="flex-1">
            <div className="p-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={pipeline.map((_, i) => `stage-${i}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {pipeline.map((stage, index) => (
                                <SortableStageCard
                                    key={`stage-${index}`}
                                    id={`stage-${index}`}
                                    stage={stage}
                                    index={index}
                                    isSelected={selectedStageIndex === index}
                                    onSelect={onSelectStage}
                                    onRemove={onRemoveStage}
                                    onPreview={onPreviewStage}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </ScrollArea>
    )
}
