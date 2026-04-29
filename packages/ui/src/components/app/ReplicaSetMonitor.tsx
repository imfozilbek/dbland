import { useEffect, useState } from "react"
import { extractErrorMessage } from "@dbland/core"
import { type ReplicaSetStatus, usePlatform } from "../../contexts/PlatformContext"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Activity, ArrowRight, CheckCircle, RefreshCw, Server, XCircle } from "lucide-react"
import { useT } from "../../i18n"

type T = ReturnType<typeof useT>

export interface ReplicaSetMonitorProps {
    connectionId: string | null
}

export function ReplicaSetMonitor({ connectionId }: ReplicaSetMonitorProps): JSX.Element {
    const t = useT()
    const platform = usePlatform()
    const [status, setStatus] = useState<ReplicaSetStatus | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [autoRefresh, setAutoRefresh] = useState(true)

    useEffect(() => {
        if (!connectionId) {
            setStatus(null)
            return
        }

        loadStatus()

        if (autoRefresh) {
            const interval = setInterval(loadStatus, 5000)
            return () => {
                clearInterval(interval)
            }
        }
    }, [connectionId, autoRefresh])

    const loadStatus = (): void => {
        if (!connectionId) {
            return
        }

        setIsLoading(true)
        setError(null)
        platform
            .getReplicaSetStatus(connectionId)
            .then((data) => {
                setStatus(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to get replica set status:", err)
                setError(extractErrorMessage(err) || t("replicaSet.loadFailed"))
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const getStateColor = (stateStr: string): "default" | "destructive" | "secondary" => {
        switch (stateStr) {
            case "PRIMARY":
                return "default"
            case "SECONDARY":
                return "secondary"
            default:
                return "destructive"
        }
    }

    const getHealthIcon = (health: number): JSX.Element => {
        return health === 1 ? (
            <CheckCircle
                className="h-4 w-4 text-[var(--success)]"
                aria-label={t("replicaSet.memberHealthyAria")}
            />
        ) : (
            <XCircle
                className="h-4 w-4 text-[var(--destructive)]"
                aria-label={t("replicaSet.memberUnhealthyAria")}
            />
        )
    }

    const formatUptime = (seconds: number, tt: T): string => {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return tt("replicaSet.uptimeFormat", { d: days, h: hours, m: minutes })
    }

    /**
     * Replication lag — distance between PRIMARY's last write and the secondary's
     * last applied op. Surfaces as a human-friendly duration; the colour cue is
     * carried by the surrounding state badge so this is purely informational.
     */
    const formatLag = (now: string, secondaryOptime: string, tt: T): string => {
        const lagMs = new Date(now).getTime() - new Date(secondaryOptime).getTime()
        if (Number.isNaN(lagMs) || lagMs < 0) {
            return tt("replicaSet.lagFormat.none")
        }
        if (lagMs < 1000) {
            return tt("replicaSet.lagFormat.ms", { ms: lagMs })
        }
        if (lagMs < 60_000) {
            return tt("replicaSet.lagFormat.s", { value: (lagMs / 1000).toFixed(1) })
        }
        const minutes = Math.floor(lagMs / 60_000)
        const seconds = Math.floor((lagMs % 60_000) / 1000)
        return tt("replicaSet.lagFormat.mAndS", { m: minutes, s: seconds })
    }

    if (!connectionId) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <Server className="mr-2 h-5 w-5" />
                {t("replicaSet.selectPrompt")}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <div className="text-destructive">{error}</div>
                <Button onClick={loadStatus} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("replicaSet.retry")}
                </Button>
            </div>
        )
    }

    if (isLoading && !status) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                {t("replicaSet.loading")}
            </div>
        )
    }

    if (!status) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                {t("replicaSet.noStatus")}
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">{status.setName}</h2>
                    <Badge variant={status.ok === 1 ? "default" : "destructive"}>
                        {status.ok === 1 ? t("replicaSet.healthy") : t("replicaSet.unhealthy")}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => {
                                setAutoRefresh(e.target.checked)
                            }}
                            className="h-4 w-4"
                        />
                        {t("replicaSet.autoRefresh")}
                    </label>
                    <Button onClick={loadStatus} variant="outline" size="sm" disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        {t("replicaSet.refresh")}
                    </Button>
                </div>
            </div>

            {/* Members */}
            <ScrollArea className="flex-1">
                <div className="space-y-3">
                    {status.members.map((member) => (
                        <Card key={member.name} className="p-4">
                            <div className="space-y-3">
                                {/* Member Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {getHealthIcon(member.health)}
                                        <div>
                                            <div className="font-mono text-sm font-medium">
                                                {member.name}
                                            </div>
                                            <Badge
                                                variant={getStateColor(member.stateStr)}
                                                className="mt-1"
                                            >
                                                {member.stateStr}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {t("replicaSet.uptime", {
                                            value: formatUptime(member.uptime, t),
                                        })}
                                    </div>
                                </div>

                                {/* Member Details */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {member.stateStr !== "PRIMARY" && (
                                        <div>
                                            <div className="text-muted-foreground">
                                                {t("replicaSet.replicationLag")}
                                            </div>
                                            <div className="font-medium">
                                                {formatLag(status.date, member.optimeDate, t)}
                                            </div>
                                        </div>
                                    )}
                                    {member.pingMs !== undefined && member.pingMs !== null && (
                                        <div>
                                            <div className="text-muted-foreground">
                                                {t("replicaSet.ping")}
                                            </div>
                                            <div className="font-medium">
                                                {t("replicaSet.pingMs", { ms: member.pingMs })}
                                            </div>
                                        </div>
                                    )}
                                    {member.syncSourceHost && (
                                        <div>
                                            <div className="text-muted-foreground">
                                                {t("replicaSet.syncSource")}
                                            </div>
                                            <div className="flex items-center gap-1 font-mono text-xs">
                                                <ArrowRight className="h-3 w-3" />
                                                {member.syncSourceHost}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-muted-foreground">
                                            {t("replicaSet.configVersion")}
                                        </div>
                                        <div className="font-medium">{member.configVersion}</div>
                                    </div>
                                    {member.lastHeartbeat && (
                                        <div>
                                            <div className="text-muted-foreground">
                                                {t("replicaSet.lastHeartbeat")}
                                            </div>
                                            <div className="text-xs">
                                                {new Date(member.lastHeartbeat).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
