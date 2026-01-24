import * as React from "react"
import { Database, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils"

export interface ToolbarProps {
    title?: string
    connectionName?: string
    databaseType?: "mongodb" | "redis"
    rightContent?: React.ReactNode
}

export function Toolbar({
    title = "DBLand",
    connectionName,
    databaseType,
    rightContent,
}: ToolbarProps): JSX.Element {
    return (
        <header className="flex h-14 items-center justify-between border-b border-[#262626] bg-[#131313] px-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1C1C1C] border border-[#262626]">
                    <Database className="h-5 w-5 text-[#3ECF8E]" />
                </div>
                <span className="text-base font-semibold text-white tracking-tight">{title}</span>
            </div>

            {/* Center - Connection indicator */}
            <div className="flex items-center gap-2">
                {connectionName ? (
                    <div className="flex items-center gap-2.5 rounded-md bg-[#1C1C1C] border border-[#262626] px-3.5 py-2">
                        <span
                            className={cn(
                                "h-2 w-2 rounded-full",
                                databaseType === "mongodb" && "bg-[#00ED64]",
                                databaseType === "redis" && "bg-[#FF6B6B]",
                            )}
                        />
                        <span className="text-sm font-medium text-white">{connectionName}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <Sparkles className="h-4 w-4" />
                        <span>No connection</span>
                    </div>
                )}
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">{rightContent}</div>
        </header>
    )
}
