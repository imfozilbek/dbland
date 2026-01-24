import { useState, useEffect } from "react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { RefreshCw } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"

interface RedisSlowLogViewerProps {
    connectionId: string
}

interface SlowLogEntry {
    id: number
    timestamp: number
    duration_micros: number
    command: string[]
}

export function RedisSlowLogViewer({ connectionId }: RedisSlowLogViewerProps): JSX.Element {
    const [entries, setEntries] = useState<SlowLogEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        void loadSlowLog()
    }, [connectionId])

    const loadSlowLog = async (): Promise<void> => {
        setIsLoading(true)
        try {
            // TODO: Call platform API to get slow log
            // const result = await platformAPI.redisSlowLog(connectionId, 50)
            // setEntries(result)
            setEntries([])
        } catch (error) {
            console.error("Failed to load slow log:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatTimestamp = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString()
    }

    const formatDuration = (micros: number): string => {
        if (micros < 1000) {
            return `${micros}µs`
        } else if (micros < 1000000) {
            return `${(micros / 1000).toFixed(2)}ms`
        } else {
            return `${(micros / 1000000).toFixed(2)}s`
        }
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
                                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                                            entry.duration_micros > 1000000
                                                ? "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100"
                                                : entry.duration_micros > 100000
                                                  ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100"
                                                  : "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                                        }`}
                                    >
                                        {formatDuration(entry.duration_micros)}
                                    </span>
                                </div>
                                <pre className="whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                                    {entry.command.join(" ")}
                                </pre>
                            </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
