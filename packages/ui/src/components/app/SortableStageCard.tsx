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

    const isEmpty = Object.keys(stage.stageData).length === 0

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`group relative cursor-pointer p-3 transition-all duration-150 hover:border-[var(--primary)]/40 ${
                isSelected
                    ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/40 ring-offset-1 ring-offset-[var(--background)]"
                    : ""
            } ${isDragging ? "z-50 shadow-lg" : ""}`}
            onClick={() => {
                onSelect(index)
            }}
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    aria-label={`Drag to reorder stage ${index + 1}`}
                    className="cursor-grab touch-none rounded text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-[var(--primary)]/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-[var(--primary)]">
                            {index + 1}
                        </span>
                        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">
                            ${stage.stageType}
                        </span>
                    </div>
                    <p
                        className={`truncate font-mono text-xs ${
                            isEmpty
                                ? "italic text-[var(--muted-foreground)]/60"
                                : "text-[var(--muted-foreground)]"
                        }`}
                    >
                        {isEmpty ? "Empty — click to configure" : JSON.stringify(stage.stageData)}
                    </p>
                </div>

                <div className="flex items-center gap-1 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
                    <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Preview stage ${index + 1}`}
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
                        aria-label={`Remove stage ${index + 1}`}
                        className="h-7 w-7 p-0 text-[var(--destructive)] hover:text-[var(--destructive)]/80"
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
