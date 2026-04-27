import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, FolderTree, Plus, Settings, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { useConnectionStore } from "../../stores/connection-store"
import { ConnectionTree } from "./ConnectionTree"

export interface SidebarProps {
    /** Current active path (for highlighting) */
    activePath?: string
    /** Callback when settings is clicked */
    onSettingsClick?: () => void
    /** Callback when add connection is clicked */
    onAddConnectionClick?: () => void
    /** Callback when a connection is selected */
    onConnectionSelect?: (connectionId: string) => void
    /** Callback when a collection is selected */
    onCollectionSelect?: (connectionId: string, database: string, collection: string) => void
}

export function Sidebar({
    activePath = "",
    onSettingsClick,
    onAddConnectionClick,
    onConnectionSelect,
    onCollectionSelect,
}: SidebarProps): JSX.Element {
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["connections"])

    const { connections, isLoading, loadConnections } = useConnectionStore()

    useEffect(() => {
        void loadConnections()
    }, [loadConnections])

    const toggleGroup = (group: string): void => {
        setExpandedGroups((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
        )
    }

    return (
        <aside className="flex w-64 flex-col bg-[#171717] border-r border-[#262626]">
            {/* Header */}
            <div className="flex h-14 items-center justify-between px-4 border-b border-[#262626]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-[#3ECF8E]/10">
                        <Sparkles className="h-4 w-4 text-[#3ECF8E]" />
                    </div>
                    <span className="text-sm font-semibold text-white">Connections</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Add connection"
                    className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
                    onClick={onAddConnectionClick}
                    title="Add Connection"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Connection list */}
            <ScrollArea className="flex-1">
                <div className="p-3">
                    {/* Connections group */}
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                toggleGroup("connections")
                            }}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                                "text-[#8F8F8F] hover:text-white hover:bg-[#262626]/50",
                                "transition-all duration-150",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]",
                            )}
                        >
                            {expandedGroups.includes("connections") ? (
                                <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                            )}
                            <FolderTree className="h-4 w-4" />
                            <span className="flex-1 text-left">All Connections</span>
                            {isLoading && (
                                <div className="h-3 w-3 rounded-full border-2 border-[#3ECF8E] border-t-transparent animate-spin" />
                            )}
                        </button>

                        {expandedGroups.includes("connections") && (
                            <div className="mt-1 ml-2 space-y-0.5 animate-fadeIn">
                                {connections.length === 0 && !isLoading && (
                                    <div className="px-3 py-6 text-center">
                                        <p className="text-xs text-[#6B7280]">No connections yet</p>
                                        <button
                                            onClick={onAddConnectionClick}
                                            className="mt-2 text-xs text-[#3ECF8E] hover:text-[#4AE19A] transition-colors"
                                        >
                                            + Add your first connection
                                        </button>
                                    </div>
                                )}

                                {connections.map((conn, index) => (
                                    <div
                                        key={conn.id}
                                        className="animate-fadeInUp"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <ConnectionTree
                                            connection={conn}
                                            isActive={activePath.includes(conn.id)}
                                            onConnectionSelect={onConnectionSelect}
                                            onCollectionSelect={onCollectionSelect}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-[#262626] p-3">
                <button
                    onClick={onSettingsClick}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                        "text-[#8F8F8F] hover:text-white hover:bg-[#262626]/50",
                        "transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]",
                        activePath === "/settings" && [
                            "bg-[#262626]",
                            "text-white",
                            "border-l-2 border-l-purple-500",
                        ],
                    )}
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    )
}
