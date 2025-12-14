import * as React from "react"
import { Database } from "lucide-react"

export interface ToolbarProps {
    title?: string
    connectionName?: string
    rightContent?: React.ReactNode
}

export function Toolbar({
    title = "DBLand",
    connectionName,
    rightContent,
}: ToolbarProps): JSX.Element {
    return (
        <header className="flex h-12 items-center justify-between border-b bg-background px-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-[15px] font-semibold tracking-tight">{title}</span>
            </div>

            {/* Center - Connection indicator */}
            <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">
                    {connectionName ?? "No connection"}
                </span>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">{rightContent}</div>
        </header>
    )
}
