import { useCallback, useEffect, useState } from "react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { RefreshCw } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { type SlowLogEntry, usePlatform } from "../../contexts/PlatformContext"

interface RedisSlowLogViewerProps {
    connectionId: string
}

const SLOW_LOG_LIMIT = 50

export function RedisSlowLogViewer({ connectionId }: RedisSlowLogViewerProps): JSX.Element {
    const platform = usePlatform()
    const [entries, setEntries] = useState<SlowLogEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const loadSlowLog = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        try {
            const result = await platform.redisSlowLog(connectionId, SLOW_LOG_LIMIT)
            setEntries(result)
        } catch (error) {
            console.error("Failed to load slow log:", error)
            setEntries([])
        } finally {
            setIsLoading(false)
        }
    }, [connectionId, platform])

    useEffect(() => {
        void loadSlowLog()
    }, [loadSlowLog])

    const formatTimestamp = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString()
    }

    const formatDuration = (micros: number): string => {
        if (micros < 1000) {
            return `${micros}µs`
        } else if (micros < 1000000) {
            return `${(micros / 1000).toFixed(2)}ms`
        }
        return `${(micros / 1000000).toFixed(2)}s`
    }

    return (
        <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Slow Log</h3>
                <Button onClick={() => void loadSlowLog()} size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-2">
                    {entries.length === 0 && !isLoading && (
                        <div className="flex h-full items-center justify-center py-8">
                            <p className="text-muted-foreground">No slow queries found</p>
                        </div>
                    )}

                    {entries.map((entry) => (
                        <Card key={entry.id} className="p-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        ID: {entry.id}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatTimestamp(entry.timestamp)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded border px-2 py-0.5 text-xs font-medium ${
                                            entry.duration > 1000000
                                                ? "border-[var(--destructive)]/30 bg-[var(--destructive)]/15 text-[var(--destructive)]"
                                                : entry.duration > 100000
                                                  ? "border-[var(--warning)]/30 bg-[var(--warning)]/15 text-[var(--warning)]"
                                                  : "border-[var(--info)]/30 bg-[var(--info)]/15 text-[var(--info)]"
                                        }`}
                                    >
                                        {formatDuration(entry.duration)}
                                    </span>
                                </div>
                                <pre className="whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                                    {entry.command}
                                </pre>
                            </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
