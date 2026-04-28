import { useEffect, useState } from "react"
import { toast } from "sonner"
import { usePlatform } from "../../contexts/PlatformContext"
import { useConfirm } from "../../hooks/use-confirm"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { EmptyState } from "../ui/empty-state"
import { Label } from "../ui/label"
import { ScrollArea } from "../ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Activity, ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react"

export interface DatabaseProfilerProps {
    connectionId: string | null
    databaseName: string | null
}

interface ProfilerLevel {
    level: number
    slowMs?: number
}

interface ProfilerEntry {
    ts: string
    op: string
    ns: string
    command: Record<string, unknown>
    millis: number
    numYield: number
    responseLength: number
}

interface ProfilerTableSectionProps {
    isLoading: boolean
    entries: ProfilerEntry[]
    profilerLevel: ProfilerLevel | null
    expandedRows: Set<number>
    toggleRowExpansion: (index: number) => void
    formatTimestamp: (ts: string) => string
    getDurationBadgeColor: (millis: number) => "default" | "secondary" | "destructive" | "outline"
}

/**
 * Loading / empty / data states for the profiler entry list. Lives in its
 * own component so the parent's branching stays under the complexity cap.
 */
function ProfilerTableSection({
    isLoading,
    entries,
    profilerLevel,
    expandedRows,
    toggleRowExpansion,
    formatTimestamp,
    getDurationBadgeColor,
}: ProfilerTableSectionProps): JSX.Element {
    if (isLoading) {
        return (
            <div className="flex h-32 items-center justify-center gap-2 text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading profiler data…</span>
            </div>
        )
    }
    if (entries.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center">
                <EmptyState
                    icon={<Activity className="h-5 w-5" />}
                    title="No profiler entries"
                    description={
                        profilerLevel?.level === 0
                            ? "Profiler is off. Enable level 1 (slow ops) or 2 (all ops) above to start collecting data."
                            : "Run a few queries on this database — they will appear here as system.profile records them."
                    }
                />
            </div>
        )
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Yields</TableHead>
                    <TableHead>Response Size</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.map((entry, index) => (
                    <>
                        <TableRow
                            key={`${entry.ts}-${entry.ns}-${index}`}
                            className="cursor-pointer"
                            tabIndex={0}
                            role="button"
                            aria-expanded={expandedRows.has(index)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    toggleRowExpansion(index)
                                }
                            }}
                            onClick={() => {
                                toggleRowExpansion(index)
                            }}
                        >
                            <TableCell>
                                {expandedRows.has(index) ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </TableCell>
                            <TableCell className="text-xs">{formatTimestamp(entry.ts)}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{entry.op}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{entry.ns}</TableCell>
                            <TableCell>
                                <Badge variant={getDurationBadgeColor(entry.millis)}>
                                    {entry.millis}ms
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">{entry.numYield}</TableCell>
                            <TableCell className="text-right">
                                {(entry.responseLength / 1024).toFixed(2)}KB
                            </TableCell>
                        </TableRow>
                        {expandedRows.has(index) && (
                            <TableRow key={`${index}-detail`}>
                                <TableCell colSpan={7} className="bg-muted/50">
                                    <div className="p-4">
                                        <div className="mb-2 text-sm font-medium">Command:</div>
                                        <pre className="overflow-auto rounded bg-background p-3 text-xs">
                                            {JSON.stringify(entry.command, null, 2)}
                                        </pre>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </>
                ))}
            </TableBody>
        </Table>
    )
}

export function DatabaseProfiler({
    connectionId,
    databaseName,
}: DatabaseProfilerProps): JSX.Element {
    const platform = usePlatform()
    const [confirm, confirmDialog] = useConfirm()
    const [profilerLevel, setProfilerLevel] = useState<ProfilerLevel | null>(null)
    const [entries, setEntries] = useState<ProfilerEntry[]>([])
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [selectedLevel, setSelectedLevel] = useState("0")
    const [slowMs, setSlowMs] = useState("100")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!connectionId || !databaseName) {
            setProfilerLevel(null)
            setEntries([])
            return
        }

        loadProfilerLevel()
        loadProfilerData()
    }, [connectionId, databaseName])

    const loadProfilerLevel = (): void => {
        if (!connectionId || !databaseName) {
            return
        }

        platform
            .getProfilerLevel(connectionId, databaseName)
            .then((level) => {
                setProfilerLevel(level)
                setSelectedLevel(level.level.toString())
                if (level.slowMs) {
                    setSlowMs(level.slowMs.toString())
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to get profiler level:", err)
            })
    }

    const loadProfilerData = (limit?: number): void => {
        if (!connectionId || !databaseName) {
            return
        }

        setIsLoading(true)
        platform
            .getProfilerData(connectionId, databaseName, limit)
            .then((data) => {
                setEntries(data)
            })
            .catch((err: unknown) => {
                console.error("Failed to get profiler data:", err)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    const handleSetProfilerLevel = (): void => {
        if (!connectionId || !databaseName) {
            return
        }

        const level = parseInt(selectedLevel, 10)
        const parsedSlowMs = parseInt(slowMs, 10)
        // Only forward a slow-ms threshold when level is "slow only" (1) and
        // the user actually typed a sane positive integer — otherwise the
        // backend gets NaN and rejects the whole call.
        const slowMsValue =
            level === 1 && Number.isFinite(parsedSlowMs) && parsedSlowMs > 0
                ? parsedSlowMs
                : undefined

        platform
            .setProfilerLevel(connectionId, databaseName, level, slowMsValue)
            .then(() => {
                toast.success("Profiler level updated")
                loadProfilerLevel()
                if (level > 0) {
                    loadProfilerData(100)
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to set profiler level:", err)
                toast.error("Failed to set profiler level", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
            })
    }

    const handleClearProfilerData = async (): Promise<void> => {
        if (!connectionId || !databaseName) {
            return
        }

        const confirmed = await confirm({
            title: "Clear profiler data?",
            description: `All collected profile entries for "${databaseName}" will be removed. The profiler level itself stays untouched.`,
            confirmLabel: "Clear",
            destructive: true,
        })
        if (!confirmed) {
            return
        }

        platform
            .clearProfilerData(connectionId, databaseName)
            .then(() => {
                setEntries([])
                toast.success("Profiler data cleared")
            })
            .catch((err: unknown) => {
                console.error("Failed to clear profiler data:", err)
                toast.error("Failed to clear profiler data", {
                    description: err instanceof Error ? err.message : "Unknown error",
                })
            })
    }

    const toggleRowExpansion = (index: number): void => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(index)) {
                newSet.delete(index)
            } else {
                newSet.add(index)
            }
            return newSet
        })
    }

    const formatTimestamp = (ts: string): string => {
        try {
            return new Date(ts).toLocaleString()
        } catch {
            return ts
        }
    }

    const getDurationBadgeColor = (millis: number): "default" | "destructive" | "secondary" => {
        if (millis > 1000) {
            return "destructive"
        }
        if (millis > 100) {
            return "default"
        }
        return "secondary"
    }

    if (!connectionId || !databaseName) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <Activity className="mr-2 h-5 w-5" />
                Select a database to view profiler
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col space-y-4 p-4">
            {/* Profiler Controls */}
            <div className="flex items-end gap-4 rounded-lg border p-4">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="profiler-level">Profiler Level</Label>
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger id="profiler-level">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">0 - Off</SelectItem>
                            <SelectItem value="1">1 - Slow operations</SelectItem>
                            <SelectItem value="2">2 - All operations</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {selectedLevel === "1" && (
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="slow-ms">Slow Query Threshold (ms)</Label>
                        <input
                            id="slow-ms"
                            type="number"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            value={slowMs}
                            onChange={(e) => {
                                setSlowMs(e.target.value)
                            }}
                            min="1"
                        />
                    </div>
                )}

                <Button onClick={handleSetProfilerLevel}>Apply</Button>

                {profilerLevel && profilerLevel.level > 0 && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            loadProfilerData(100)
                        }}
                    >
                        Refresh
                    </Button>
                )}

                {entries.length > 0 && (
                    <Button
                        variant="destructive"
                        onClick={() => {
                            void handleClearProfilerData()
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Data
                    </Button>
                )}
            </div>

            {/* Current Status */}
            {profilerLevel && (
                <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={profilerLevel.level === 0 ? "secondary" : "default"}>
                            Level {profilerLevel.level}
                            {profilerLevel.level === 0 && " (Off)"}
                            {profilerLevel.level === 1 && " (Slow Ops)"}
                            {profilerLevel.level === 2 && " (All Ops)"}
                        </Badge>
                        {profilerLevel.slowMs && (
                            <span className="text-sm text-muted-foreground">
                                Threshold: {profilerLevel.slowMs}ms
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Profiler Data Table */}
            <div className="flex-1 overflow-hidden rounded-lg border">
                <ScrollArea className="h-full">
                    <ProfilerTableSection
                        isLoading={isLoading}
                        entries={entries}
                        profilerLevel={profilerLevel}
                        expandedRows={expandedRows}
                        toggleRowExpansion={toggleRowExpansion}
                        formatTimestamp={formatTimestamp}
                        getDurationBadgeColor={getDurationBadgeColor}
                    />
                </ScrollArea>
            </div>
            {confirmDialog}
        </div>
    )
}
