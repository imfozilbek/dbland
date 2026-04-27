import { Circle, Loader2, Wifi, WifiOff } from "lucide-react"
import { cn } from "../../lib/utils"

export type StatusBarStatus = "connected" | "disconnected" | "connecting" | "error" | "ready"

export interface StatusBarProps {
    status?: StatusBarStatus
    statusText?: string
    centerText?: string
    version?: string
}

interface StatusConfig {
    icon: React.ReactNode
    color: string
    text: string
}

const STATUS_CONFIGS: Record<StatusBarStatus, StatusConfig> = {
    connected: {
        icon: <Wifi className="h-3 w-3" />,
        color: "text-[var(--success)]",
        text: "Connected",
    },
    disconnected: {
        icon: <WifiOff className="h-3 w-3" />,
        color: "text-[var(--muted-foreground)]",
        text: "Disconnected",
    },
    connecting: {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        color: "text-[var(--warning)]",
        text: "Connecting…",
    },
    error: {
        icon: <Circle className="h-2 w-2 fill-current" />,
        color: "text-[var(--destructive)]",
        text: "Error",
    },
    ready: {
        icon: <Circle className="h-2 w-2 fill-current" />,
        color: "text-[var(--muted-foreground)]",
        text: "Ready",
    },
}

export function StatusBar({
    status = "disconnected",
    statusText,
    centerText = "Ready",
    version = "v1.1.0",
}: StatusBarProps): JSX.Element {
    const config = STATUS_CONFIGS[status]

    return (
        <footer
            role="status"
            aria-live="polite"
            className="flex h-7 items-center justify-between border-t border-[var(--border)] bg-[var(--card)] px-4 text-xs"
        >
            {/* Left — connection status */}
            <div className={cn("flex items-center gap-1.5", config.color)}>
                {config.icon}
                <span>{statusText ?? config.text}</span>
            </div>

            {/* Center — query / workspace status */}
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span>{centerText}</span>
            </div>

            {/* Right — build version */}
            <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)]/60 font-mono tabular-nums">
                    {version}
                </span>
            </div>
        </footer>
    )
}
