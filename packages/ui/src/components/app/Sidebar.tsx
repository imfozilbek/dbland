import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, FolderTree, Plus, Settings } from "lucide-react"
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
        <aside className="flex w-60 flex-col border-r bg-background">
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b px-3">
                <span className="text-[13px] font-semibold tracking-tight">Connections</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={onAddConnectionClick}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Connection list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {/* Connections group */}
                    <div>
                        <button
                            onClick={() => {
                                toggleGroup("connections")
                            }}
                            className={cn(
                                "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium",
                                "transition-colors duration-150 hover:bg-muted",
                            )}
                        >
                            {expandedGroups.includes("connections") ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>All Connections</span>
                            {isLoading && (
                                <span className="ml-auto text-[11px] text-muted-foreground">
                                    ...
                                </span>
                            )}
                        </button>

                        {expandedGroups.includes("connections") && (
                            <div className="mt-0.5">
                                {connections.length === 0 && !isLoading && (
                                    <p className="px-2 py-2 text-center text-[12px] italic text-muted-foreground">
                                        No connections yet
                                    </p>
                                )}

                                {connections.map((conn) => (
                                    <ConnectionTree
                                        key={conn.id}
                                        connection={conn}
                                        isActive={activePath.includes(conn.id)}
                                        onConnectionSelect={onConnectionSelect}
                                        onCollectionSelect={onCollectionSelect}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-2">
                <button
                    onClick={onSettingsClick}
                    className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
                        "transition-colors duration-150 hover:bg-muted",
                        activePath === "/settings" && "bg-muted font-medium",
                    )}
                >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    )
}
