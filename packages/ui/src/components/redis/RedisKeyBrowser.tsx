import { useState } from "react"
import { Key, Loader2, Search } from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { EmptyState } from "../ui/empty-state"
import { ScrollArea } from "../ui/scroll-area"
import { usePlatform } from "../../contexts/PlatformContext"

interface RedisKeyBrowserProps {
    connectionId: string
    onKeySelect: (key: string) => void
    selectedKey?: string
}

const SCAN_BATCH_SIZE = 100

export function RedisKeyBrowser({
    connectionId,
    onKeySelect,
    selectedKey,
}: RedisKeyBrowserProps): JSX.Element {
    const platform = usePlatform()
    const [pattern, setPattern] = useState("*")
    const [keys, setKeys] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const handleScan = async (): Promise<void> => {
        setIsLoading(true)
        try {
            const result = await platform.redisScanKeys({
                connectionId,
                pattern,
                count: SCAN_BATCH_SIZE,
            })
            setKeys(result.keys)
        } catch (error) {
            console.error("Failed to scan keys:", error)
            setKeys([])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-full flex-col gap-2">
            <div className="flex gap-2">
                <Input
                    placeholder="Pattern (e.g., user:*)"
                    value={pattern}
                    onChange={(e) => {
                        setPattern(e.target.value)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            void handleScan()
                        }
                    }}
                />
                <Button
                    onClick={() => void handleScan()}
                    disabled={isLoading}
                    size="icon"
                    aria-label="Scan Redis keys"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-1">
                    {keys.length === 0 && !isLoading && (
                        <EmptyState
                            size="compact"
                            icon={<Key className="h-4 w-4" />}
                            title="No keys"
                            description={`Pattern "${pattern}" matched zero keys. Try a wider glob like "*" or "user:*".`}
                        />
                    )}
                    {keys.map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                onKeySelect(key)
                            }}
                            className={`w-full truncate rounded px-2 py-1 text-left font-mono text-sm transition-colors duration-150 hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                selectedKey === key
                                    ? "bg-[var(--accent)] text-[var(--foreground)]"
                                    : "text-[var(--muted-foreground)]"
                            }`}
                            aria-pressed={selectedKey === key}
                            title={key}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
