import * as React from "react"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Card } from "../ui/card"
import { Plus } from "lucide-react"

export interface StageLibraryProps {
    onAddStage: (stageType: string) => void
}

const STAGE_DEFINITIONS = [
    {
        type: "match",
        label: "$match",
        description: "Filter documents",
        icon: "🔍",
    },
    {
        type: "group",
        label: "$group",
        description: "Group by field",
        icon: "📊",
    },
    {
        type: "project",
        label: "$project",
        description: "Include/exclude fields",
        icon: "📋",
    },
    {
        type: "sort",
        label: "$sort",
        description: "Sort documents",
        icon: "⬆️",
    },
    {
        type: "limit",
        label: "$limit",
        description: "Limit results",
        icon: "🔢",
    },
    {
        type: "skip",
        label: "$skip",
        description: "Skip documents",
        icon: "⏭️",
    },
    {
        type: "unwind",
        label: "$unwind",
        description: "Deconstruct array",
        icon: "📦",
    },
    {
        type: "lookup",
        label: "$lookup",
        description: "Join collections",
        icon: "🔗",
    },
    {
        type: "addFields",
        label: "$addFields",
        description: "Add new fields",
        icon: "➕",
    },
    {
        type: "count",
        label: "$count",
        description: "Count documents",
        icon: "#️⃣",
    },
]

export function StageLibrary({ onAddStage }: StageLibraryProps): JSX.Element {
    return (
        <div className="flex h-full flex-col border-r">
            <div className="border-b p-3">
                <h3 className="text-sm font-semibold">Stage Library</h3>
                <p className="text-xs text-muted-foreground">Click to add stages</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                    {STAGE_DEFINITIONS.map((stage) => (
                        <Card
                            key={stage.type}
                            className="cursor-pointer p-3 transition-colors hover:bg-muted/50"
                            onClick={() => {
                                onAddStage(stage.type)
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-lg">{stage.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono font-semibold">
                                            {stage.label}
                                        </span>
                                        <Plus className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {stage.description}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
