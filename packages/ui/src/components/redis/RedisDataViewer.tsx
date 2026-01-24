import { useState, useEffect } from "react"
import { Card } from "../ui/card"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ScrollArea } from "../ui/scroll-area"
import { Clock } from "lucide-react"

interface RedisDataViewerProps {
    connectionId: string
    selectedKey: string
}

type RedisValue =
    | { type: "string"; value: string }
    | { type: "list"; values: string[] }
    | { type: "set"; values: string[] }
    | { type: "zset"; values: Array<[string, number]> }
    | { type: "hash"; fields: Array<[string, string]> }
    | { type: "none" }

export function RedisDataViewer({
    connectionId,
    selectedKey,
}: RedisDataViewerProps): JSX.Element {
    const [value, setValue] = useState<RedisValue>({ type: "none" })
    const [ttl, setTTL] = useState<number | null>(null)
    const [newTTL, setNewTTL] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        void loadValue()
    }, [selectedKey, connectionId])

    const loadValue = async (): Promise<void> => {
        setIsLoading(true)
        try {
            // TODO: Call platform API to get value
            // const result = await platformAPI.redisGetValue(connectionId, selectedKey)
            // setValue(result.value)
            // setTTL(result.ttl)
        } catch (error) {
            console.error("Failed to load value:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSetTTL = async (): Promise<void> => {
        const seconds = parseInt(newTTL, 10)
        if (isNaN(seconds)) {
            return
        }

        try {
            // TODO: Call platform API to set TTL
            // await platformAPI.redisSetTTL(connectionId, selectedKey, seconds)
            setTTL(seconds)
            setNewTTL("")
        } catch (error) {
            console.error("Failed to set TTL:", error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">{selectedKey}</h3>
                    <p className="text-sm text-muted-foreground">Type: {value.type}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {ttl === null ? (
                        <span className="text-sm text-muted-foreground">No expiration</span>
                    ) : (
                        <span className="text-sm text-muted-foreground">{ttl}s</span>
                    )}
                </div>
            </div>

            <Card className="p-4">
                <Label>Set TTL (seconds)</Label>
                <div className="mt-2 flex gap-2">
                    <Input
                        type="number"
                        placeholder="3600"
                        value={newTTL}
                        onChange={(e) => setNewTTL(e.target.value)}
                    />
                    <Button onClick={() => void handleSetTTL()}>Set</Button>
                </div>
            </Card>

            <ScrollArea className="flex-1">
                {value.type === "string" && (
                    <Card className="p-4">
                        <pre className="whitespace-pre-wrap break-words text-sm">{value.value}</pre>
                    </Card>
                )}

                {value.type === "list" && (
                    <div className="space-y-2">
                        {value.values.map((item, index) => (
                            <Card key={index} className="p-3">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground">{index}</span>
                                    <span className="flex-1 text-sm">{item}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {value.type === "set" && (
                    <div className="space-y-2">
                        {value.values.map((item, index) => (
                            <Card key={index} className="p-3">
                                <span className="text-sm">{item}</span>
                            </Card>
                        ))}
                    </div>
                )}

                {value.type === "zset" && (
                    <div className="space-y-2">
                        {value.values.map(([member, score], index) => (
                            <Card key={index} className="p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">{member}</span>
                                    <span className="text-xs text-muted-foreground">{score}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {value.type === "hash" && (
                    <div className="space-y-2">
                        {value.fields.map(([field, fieldValue], index) => (
                            <Card key={index} className="p-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Field</Label>
                                        <p className="text-sm">{field}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Value</Label>
                                        <p className="text-sm">{fieldValue}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {value.type === "none" && (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground">Key not found or has no value</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
