import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, FolderTree, Plus, Settings, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { type Connection, useConnectionStore } from "../../stores/connection-store"
import { ConnectionTree } from "./ConnectionTree"

export interface SidebarProps {
    /** Current active path (for highlighting) */
    activePath?: string
    /** Callback when settings is clicked */
    onSettingsClick?: () => void
    /** Callback when add connection is clicked */
    onAddConnectionClick?: () => void
    /** Callback when the user picks "Edit" on a connection's context menu. */
    onEditConnection?: (connection: Connection) => void
    /** Callback when a connection is selected */
    onConnectionSelect?: (connectionId: string) => void
    /** Callback when a collection is selected */
    onCollectionSelect?: (connectionId: string, database: string, collection: string) => void
}

export function Sidebar({
    activePath = "",
    onSettingsClick,
    onAddConnectionClick,
    onEditConnection,
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

    const connectionsExpanded = expandedGroups.includes("connections")
    const settingsActive = activePath === "/settings"

    return (
        <aside className="flex w-64 flex-col bg-[var(--card)] border-r border-[var(--border)]">
            {/* Header */}
            <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-[var(--primary)]/10">
                        <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                        Connections
                    </span>
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
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                toggleGroup("connections")
                            }}
                            aria-expanded={connectionsExpanded}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                                "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                                "hover:bg-[var(--accent)]/40",
                                "transition-colors duration-150",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                            )}
                        >
                            {connectionsExpanded ? (
                                <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                            )}
                            <FolderTree className="h-4 w-4" />
                            <span className="flex-1 text-left">All Connections</span>
                            {connections.length > 0 && (
                                <span className="font-mono text-[10px] text-[var(--muted-foreground)] tabular-nums">
                                    {connections.length}
                                </span>
                            )}
                            {isLoading && (
                                <div
                                    role="status"
                                    aria-label="Loading connections"
                                    className="h-3 w-3 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"
                                />
                            )}
                        </button>

                        {connectionsExpanded && (
                            <div className="mt-1 ml-2 space-y-0.5 animate-fadeIn">
                                {connections.length === 0 && !isLoading && (
                                    <div className="px-3 py-6 text-center">
                                        <p className="text-xs text-[var(--muted-foreground)]">
                                            No connections yet
                                        </p>
                                        <button
                                            onClick={onAddConnectionClick}
                                            className="mt-2 text-xs text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
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
                                            onEditConnection={onEditConnection}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-[var(--border)] p-3">
                <button
                    onClick={onSettingsClick}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                        "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                        "hover:bg-[var(--accent)]/40",
                        "transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        settingsActive &&
                            "bg-[var(--accent)] text-[var(--foreground)] border-l-2 border-l-[var(--special)]",
                    )}
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </button>
            </div>
        </aside>
    )
}
