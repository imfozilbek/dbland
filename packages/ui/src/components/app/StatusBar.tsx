import { Circle } from "lucide-react"
import { cn } from "../../lib/utils"

export type StatusBarStatus = "connected" | "disconnected" | "connecting" | "error" | "ready"

export interface StatusBarProps {
    status?: StatusBarStatus
    statusText?: string
    centerText?: string
    version?: string
}

export function StatusBar({
    status = "disconnected",
    statusText,
    centerText = "Ready",
    version = "v0.2.0",
}: StatusBarProps): JSX.Element {
    const statusColors: Record<StatusBarStatus, string> = {
        connected: "fill-green-500 text-green-500",
        disconnected: "fill-gray-400 text-gray-400",
        connecting: "fill-yellow-500 text-yellow-500 animate-pulse",
        error: "fill-red-500 text-red-500",
        ready: "fill-gray-400 text-gray-400",
    }

    const defaultStatusText: Record<StatusBarStatus, string> = {
        connected: "Connected",
        disconnected: "Disconnected",
        connecting: "Connecting...",
        error: "Error",
        ready: "Ready",
    }

    return (
        <footer className="flex h-6 items-center justify-between border-t bg-muted/30 px-4 text-[11px] text-muted-foreground">
            {/* Left - Connection status */}
            <div className="flex items-center gap-1.5">
                <Circle className={cn("h-2 w-2", statusColors[status])} />
                <span>{statusText ?? defaultStatusText[status]}</span>
            </div>

            {/* Center - Query status */}
            <div className="flex items-center gap-2">
                <span>{centerText}</span>
            </div>

            {/* Right - Version */}
            <div className="flex items-center gap-2">
                <span>{version}</span>
            </div>
        </footer>
    )
}
