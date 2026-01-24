import { useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"

interface RedisKeyBrowserProps {
    connectionId: string
    onKeySelect: (key: string) => void
    selectedKey?: string
}

export function RedisKeyBrowser({
    connectionId: _connectionId,
    onKeySelect,
    selectedKey,
}: RedisKeyBrowserProps): JSX.Element {
    const [pattern, setPattern] = useState("*")
    const [keys, setKeys] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const handleScan = async (): Promise<void> => {
        setIsLoading(true)
        try {
            // Call platform API to scan keys
            // TODO: Implement platform API call
            // const result = await platformAPI.redisScanKeys(connectionId, pattern, 100)
            // setKeys(result.keys)
            setKeys([])
        } catch (error) {
            console.error("Failed to scan keys:", error)
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
                <Button onClick={() => void handleScan()} disabled={isLoading} size="icon">
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
                        <div className="py-4 text-center text-sm text-muted-foreground">
                            No keys found. Enter a pattern and click search.
                        </div>
                    )}
                    {keys.map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                onKeySelect(key)
                            }}
                            className={`w-full rounded px-2 py-1 text-left text-sm hover:bg-accent ${
                                selectedKey === key ? "bg-accent" : ""
                            }`}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
