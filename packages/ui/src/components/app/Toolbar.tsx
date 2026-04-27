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
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)]">
                    <Database className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                    {title}
                </span>
            </div>

            {/* Center — connection indicator */}
            <div className="flex items-center gap-2">
                {connectionName ? (
                    <div className="flex items-center gap-2.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-3.5 py-2">
                        <span
                            aria-hidden="true"
                            className={cn(
                                "h-2 w-2 rounded-full",
                                databaseType === "mongodb" && "bg-[var(--mongodb)]",
                                databaseType === "redis" && "bg-[var(--redis)]",
                            )}
                        />
                        <span className="text-sm font-medium text-[var(--foreground)]">
                            {connectionName}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]/70">
                        <Sparkles className="h-4 w-4" />
                        <span>No connection</span>
                    </div>
                )}
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2">{rightContent}</div>
        </header>
    )
}
