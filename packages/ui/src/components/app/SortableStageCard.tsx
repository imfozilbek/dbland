import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { Eye, GripVertical, Trash2 } from "lucide-react"
import type { AggregationPipelineStage } from "../../contexts/PlatformContext"

export interface SortableStageCardProps {
    id: string
    stage: AggregationPipelineStage
    index: number
    isSelected: boolean
    onSelect: (index: number) => void
    onRemove: (index: number) => void
    onPreview: (index: number) => void
}

export function SortableStageCard({
    id,
    stage,
    index,
    isSelected,
    onSelect,
    onRemove,
    onPreview,
}: SortableStageCardProps): JSX.Element {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`p-3 ${isSelected ? "ring-2 ring-primary" : ""} ${isDragging ? "z-50" : ""}`}
            onClick={() => {
                onSelect(index)
            }}
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5" />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-mono font-semibold">
                            {index + 1}
                        </span>
                        <span className="text-sm font-mono font-semibold">${stage.stageType}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                        {Object.keys(stage.stageData).length > 0
                            ? JSON.stringify(stage.stageData)
                            : "Empty stage"}
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                            e.stopPropagation()
                            onPreview(index)
                        }}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemove(index)
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    )
}
