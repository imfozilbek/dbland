import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, ChevronRight, Database, FolderTree, Plus, Settings } from "lucide-react"
import { Button, cn, ScrollArea } from "@dbland/ui"

interface Connection {
    id: string
    name: string
    type: "mongodb" | "redis"
    status: "connected" | "disconnected" | "error"
}

// Mock data - will be replaced with real data from Tauri
const mockConnections: Connection[] = [
    { id: "1", name: "Local MongoDB", type: "mongodb", status: "disconnected" },
    { id: "2", name: "Production DB", type: "mongodb", status: "disconnected" },
    { id: "3", name: "Redis Cache", type: "redis", status: "disconnected" },
]

export function Sidebar() {
    const location = useLocation()
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["connections"])

    const toggleGroup = (group: string) => {
        setExpandedGroups((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
        )
    }

    return (
        <aside className="flex w-64 flex-col border-r bg-muted/30">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium">Connections</span>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
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
                        </button>

                        {expandedGroups.includes("connections") && (
                            <div className="ml-4 mt-1 space-y-1">
                                {mockConnections.map((conn) => (
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
                                            className={cn(
                                                "h-4 w-4",
                                                conn.type === "mongodb"
                                                    ? "text-[#00ed64]"
                                                    : "text-[#dc382d]",
                                            )}
                                        />
                                        <span className="truncate">{conn.name}</span>
                                        <span
                                            className={cn(
                                                "ml-auto h-2 w-2 rounded-full",
                                                conn.status === "connected" && "bg-green-500",
                                                conn.status === "disconnected" && "bg-gray-400",
                                                conn.status === "error" && "bg-red-500",
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
