import { Circle } from "lucide-react"

export function StatusBar() {
    return (
        <footer className="flex h-6 items-center justify-between border-t bg-muted/30 px-4 text-xs text-muted-foreground">
            {/* Left - Connection status */}
            <div className="flex items-center gap-2">
                <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />
                <span>Disconnected</span>
            </div>

            {/* Center - Query status */}
            <div className="flex items-center gap-2">
                <span>Ready</span>
            </div>

            {/* Right - Version */}
            <div className="flex items-center gap-2">
                <span>v0.1.0</span>
            </div>
        </footer>
    )
}
