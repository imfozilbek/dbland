import { Database } from "lucide-react"

export function Toolbar() {
    return (
        <header className="flex h-12 items-center justify-between border-b bg-background px-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">DBLand</span>
            </div>

            {/* Center - Connection selector (placeholder) */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">No connection</span>
            </div>

            {/* Right - Actions (placeholder) */}
            <div className="flex items-center gap-2">
                {/* Future: User menu, notifications, etc. */}
            </div>
        </header>
    )
}
