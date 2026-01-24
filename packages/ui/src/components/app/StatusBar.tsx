import { Circle, Loader2, Wifi, WifiOff } from "lucide-react"
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
    version = "v1.0.0",
}: StatusBarProps): JSX.Element {
    const statusConfig: Record<
        StatusBarStatus,
        { icon: React.ReactNode; color: string; text: string }
    > = {
        connected: {
            icon: <Wifi className="h-3 w-3" />,
            color: "text-[#22C55E]",
            text: "Connected",
        },
        disconnected: {
            icon: <WifiOff className="h-3 w-3" />,
            color: "text-[#6B7280]",
            text: "Disconnected",
        },
        connecting: {
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
            color: "text-[#F59E0B]",
            text: "Connecting...",
        },
        error: {
            icon: <Circle className="h-2 w-2 fill-current" />,
            color: "text-[#EF4444]",
            text: "Error",
        },
        ready: {
            icon: <Circle className="h-2 w-2 fill-current" />,
            color: "text-[#6B7280]",
            text: "Ready",
        },
    }

    const config = statusConfig[status]

    return (
        <footer className="flex h-7 items-center justify-between border-t border-[#27272A] bg-[#0F0F11] px-4 text-xs">
            {/* Left - Connection status */}
            <div className={cn("flex items-center gap-1.5", config.color)}>
                {config.icon}
                <span>{statusText ?? config.text}</span>
            </div>

            {/* Center - Query status */}
            <div className="flex items-center gap-2 text-[#6B7280]">
                <span>{centerText}</span>
            </div>

            {/* Right - Version */}
            <div className="flex items-center gap-2">
                <span className="text-[#52525B] font-mono">{version}</span>
            </div>
        </footer>
    )
}
