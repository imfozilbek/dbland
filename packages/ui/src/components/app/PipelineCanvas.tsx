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
import { EmptyState } from "../ui/empty-state"
import { ScrollArea } from "../ui/scroll-area"
import type { AggregationPipelineStage } from "../../contexts/PlatformContext"
import { Workflow } from "lucide-react"

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
            <div className="flex h-full items-center justify-center">
                <EmptyState
                    icon={<Workflow className="h-5 w-5" />}
                    title="Empty pipeline"
                    description="Pick a stage from the library on the left — $match, $group, $project, $sort and friends — and drop it here to begin building."
                />
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
