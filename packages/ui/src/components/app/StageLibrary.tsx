import { ScrollArea } from "../ui/scroll-area"
import {
    ArrowDownUp,
    Filter,
    GitMerge,
    Hash,
    Layers,
    ListPlus,
    type LucideIcon,
    PackageOpen,
    Plus,
    SkipForward,
    SquareSplitHorizontal,
} from "lucide-react"

export interface StageLibraryProps {
    onAddStage: (stageType: string) => void
}

interface StageDefinition {
    type: string
    label: string
    description: string
    icon: LucideIcon
}

/**
 * Match each pipeline stage to a glyph that *says something* about the
 * operation, instead of the previous emoji icons (🔍 📊 ⬆️ …) which read as
 * decoration in the otherwise tool-grade workspace.
 */
const STAGE_DEFINITIONS: StageDefinition[] = [
    { type: "match", label: "$match", description: "Filter documents by criteria", icon: Filter },
    { type: "group", label: "$group", description: "Group by field and aggregate", icon: Layers },
    {
        type: "project",
        label: "$project",
        description: "Include or exclude fields",
        icon: SquareSplitHorizontal,
    },
    { type: "sort", label: "$sort", description: "Sort by one or more fields", icon: ArrowDownUp },
    { type: "limit", label: "$limit", description: "Cap the number of results", icon: Hash },
    { type: "skip", label: "$skip", description: "Skip the first N documents", icon: SkipForward },
    {
        type: "unwind",
        label: "$unwind",
        description: "Deconstruct an array field",
        icon: PackageOpen,
    },
    { type: "lookup", label: "$lookup", description: "Join another collection", icon: GitMerge },
    {
        type: "addFields",
        label: "$addFields",
        description: "Compute new fields per doc",
        icon: ListPlus,
    },
    { type: "count", label: "$count", description: "Count documents in the result", icon: Hash },
]

export function StageLibrary({ onAddStage }: StageLibraryProps): JSX.Element {
    return (
        <div className="flex h-full flex-col border-r border-[var(--border)]">
            <div className="border-b border-[var(--border)] p-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Stage Library</h3>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
                    {STAGE_DEFINITIONS.length} stages
                </p>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-1 p-2">
                    {STAGE_DEFINITIONS.map((stage) => {
                        const Icon = stage.icon
                        return (
                            <button
                                key={stage.type}
                                type="button"
                                onClick={() => {
                                    onAddStage(stage.type)
                                }}
                                aria-label={`Add ${stage.label} stage — ${stage.description}`}
                                className="group flex w-full items-start gap-3 rounded-md border border-transparent bg-transparent p-2 text-left transition-colors duration-150 hover:border-[var(--border)] hover:bg-[var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                            >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--primary)] transition-colors group-hover:border-[var(--primary)]/40">
                                    <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-mono text-sm font-semibold text-[var(--foreground)]">
                                        {stage.label}
                                    </span>
                                    <span className="block truncate text-xs text-[var(--muted-foreground)]">
                                        {stage.description}
                                    </span>
                                </span>
                                <Plus className="mt-1 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 text-[var(--primary)]" />
                            </button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
