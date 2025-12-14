import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, ChevronRight, Database, FolderTree, Plus, Settings } from "lucide-react"
import { Button, cn, ScrollArea } from "@dbland/ui"
import { type Connection, useConnectionStore } from "../../stores"

export function Sidebar(): JSX.Element {
    const location = useLocation()
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

    const getStatusColor = (status: Connection["status"]): string => {
        switch (status) {
            case "connected":
                return "bg-green-500"
            case "connecting":
                return "bg-yellow-500 animate-pulse"
            case "error":
                return "bg-red-500"
            default:
                return "bg-gray-400"
        }
    }

    const getTypeColor = (type: Connection["type"]): string => {
        return type === "mongodb" ? "text-[#00ed64]" : "text-[#dc382d]"
    }

    return (
        <aside className="flex w-64 flex-col border-r bg-muted/30">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium">Connections</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link to="/?action=new-connection">
                        <Plus className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            {/* Connection list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {/* Connections group */}
                    <div className="mb-2">
                        <button
                            onClick={() => {
                                toggleGroup("connections")
                            }}
                            className="flex w-full items-center gap-1 rounded px-2 py-1 text-sm font-medium hover:bg-accent"
                        >
                            {expandedGroups.includes("connections") ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                            <FolderTree className="h-4 w-4" />
                            <span>All Connections</span>
                            {isLoading && (
                                <span className="ml-auto text-xs text-muted-foreground">...</span>
                            )}
                        </button>

                        {expandedGroups.includes("connections") && (
                            <div className="ml-4 mt-1 space-y-1">
                                {connections.length === 0 && !isLoading && (
                                    <p className="px-2 py-1 text-xs text-muted-foreground">
                                        No connections yet
                                    </p>
                                )}

                                {connections.map((conn) => (
                                    <Link
                                        key={conn.id}
                                        to={`/workspace/${conn.id}`}
                                        className={cn(
                                            "flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent",
                                            location.pathname === `/workspace/${conn.id}` &&
                                                "bg-accent",
                                        )}
                                    >
                                        <Database
                                            className={cn("h-4 w-4", getTypeColor(conn.type))}
                                        />
                                        <span className="truncate">{conn.name}</span>
                                        <span
                                            className={cn(
                                                "ml-auto h-2 w-2 rounded-full",
                                                getStatusColor(conn.status),
                                            )}
                                        />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-2">
                <Link
                    to="/settings"
                    className={cn(
                        "flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent",
                        location.pathname === "/settings" && "bg-accent",
                    )}
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </Link>
            </div>
        </aside>
    )
}
