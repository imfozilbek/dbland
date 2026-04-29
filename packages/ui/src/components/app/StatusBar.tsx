import { Circle, Loader2, Wifi, WifiOff } from "lucide-react"
import { cn } from "../../lib/utils"
import { useT } from "../../i18n"

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
    /** i18n key under `status.*` */
    textKey: "connected" | "disconnected" | "connecting" | "error" | "ready"
}

const STATUS_CONFIGS: Record<StatusBarStatus, StatusConfig> = {
    connected: {
        icon: <Wifi className="h-3 w-3" />,
        color: "text-[var(--success)]",
        textKey: "connected",
    },
    disconnected: {
        icon: <WifiOff className="h-3 w-3" />,
        color: "text-[var(--muted-foreground)]",
        textKey: "disconnected",
    },
    connecting: {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        color: "text-[var(--warning)]",
        textKey: "connecting",
    },
    error: {
        icon: <Circle className="h-2 w-2 fill-current" />,
        color: "text-[var(--destructive)]",
        textKey: "error",
    },
    ready: {
        icon: <Circle className="h-2 w-2 fill-current" />,
        color: "text-[var(--muted-foreground)]",
        textKey: "ready",
    },
}

export function StatusBar({
    status = "disconnected",
    statusText,
    centerText,
    // The hosting app is expected to pass `version` from its build-
    // time constant (`__APP_VERSION__` in the desktop and web apps,
    // wired via Vite's `define` from package.json). The fallback used
    // to be a hard-coded "v1.1.0" that drifted on every release; an
    // empty string is a more honest signal that the host forgot.
    version = "",
}: StatusBarProps): JSX.Element {
    const t = useT()
    const config = STATUS_CONFIGS[status]
    const resolvedCenter = centerText ?? t("status.ready")

    return (
        <footer
            role="status"
            aria-live="polite"
            className="flex h-7 items-center justify-between border-t border-[var(--border)] bg-[var(--card)] px-4 text-xs"
        >
            {/* Left — connection status */}
            <div className={cn("flex items-center gap-1.5", config.color)}>
                {config.icon}
                <span>{statusText ?? t(`status.${config.textKey}`)}</span>
            </div>

            {/* Center — query / workspace status */}
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span>{resolvedCenter}</span>
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
