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
import { useT } from "../../i18n"

export interface StageLibraryProps {
    onAddStage: (stageType: string) => void
}

/**
 * Stage description keys live alongside the i18n bundle now —
 * `aggregationBuilder.library.descriptions.<type>` maps to a localised
 * one-liner. The `label` is the MongoDB operator name ($match, $group,
 * …) and is intentionally NOT translated; that's pipeline syntax users
 * paste between locales and docs.
 */
type StageType =
    | "match"
    | "group"
    | "project"
    | "sort"
    | "limit"
    | "skip"
    | "unwind"
    | "lookup"
    | "addFields"
    | "count"

interface StageDefinition {
    type: StageType
    label: string
    icon: LucideIcon
}

const STAGE_DEFINITIONS: StageDefinition[] = [
    { type: "match", label: "$match", icon: Filter },
    { type: "group", label: "$group", icon: Layers },
    { type: "project", label: "$project", icon: SquareSplitHorizontal },
    { type: "sort", label: "$sort", icon: ArrowDownUp },
    { type: "limit", label: "$limit", icon: Hash },
    { type: "skip", label: "$skip", icon: SkipForward },
    { type: "unwind", label: "$unwind", icon: PackageOpen },
    { type: "lookup", label: "$lookup", icon: GitMerge },
    { type: "addFields", label: "$addFields", icon: ListPlus },
    { type: "count", label: "$count", icon: Hash },
]

export function StageLibrary({ onAddStage }: StageLibraryProps): JSX.Element {
    const t = useT()
    return (
        <div className="flex h-full flex-col border-r border-[var(--border)]">
            <div className="border-b border-[var(--border)] p-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {t("aggregationBuilder.library.title")}
                </h3>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/70">
                    {t("aggregationBuilder.library.stagesCount", {
                        count: STAGE_DEFINITIONS.length,
                    })}
                </p>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-1 p-2">
                    {STAGE_DEFINITIONS.map((stage) => {
                        const Icon = stage.icon
                        const description = t(
                            `aggregationBuilder.library.descriptions.${stage.type}`,
                        )
                        return (
                            <button
                                key={stage.type}
                                type="button"
                                onClick={() => {
                                    onAddStage(stage.type)
                                }}
                                aria-label={t("aggregationBuilder.library.addStageAria", {
                                    label: stage.label,
                                    description,
                                })}
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
                                        {description}
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
