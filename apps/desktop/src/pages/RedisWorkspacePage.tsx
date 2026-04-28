import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
    EmptyState,
    RedisDataViewer,
    RedisKeyBrowser,
    RedisSlowLogViewer,
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    useConnectionStore,
} from "@dbland/ui"
import { Clock, Database, Key, MousePointerClick } from "lucide-react"

export function RedisWorkspacePage(): JSX.Element {
    const { connectionId } = useParams()
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const { connections } = useConnectionStore()
    const connection = connections.find((c) => c.id === connectionId)
    const connectionLabel = connection?.name ?? "Unknown connection"
    const connectionTarget = connection ? `${connection.host}:${connection.port}` : null

    // The selected key belongs to a specific connection — when the user
    // navigates to a different one (e.g. via the sidebar), drop the
    // selection so the right pane doesn't try to load `user:123` from a
    // server where that key doesn't exist.
    useEffect(() => {
        setSelectedKey(null)
    }, [connectionId])

    return (
        <div className="flex h-full flex-col">
            {/* Header — show the human-readable connection name + host:port instead
                of the opaque UUID the previous version surfaced. */}
            <div className="border-b border-[var(--border)]">
                <div className="flex items-center gap-2 px-4 py-3 text-sm">
                    <Database className="h-4 w-4 text-[var(--redis)]" />
                    <span className="text-[var(--muted-foreground)]">Redis</span>
                    <span className="font-medium text-[var(--foreground)]">{connectionLabel}</span>
                    {connectionTarget && (
                        <span className="font-mono text-xs text-[var(--muted-foreground)]/70">
                            · {connectionTarget}
                        </span>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="browser" className="flex flex-1 flex-col">
                <TabsList className="mx-4 mt-2">
                    <TabsTrigger value="browser" className="gap-2">
                        <Key className="h-4 w-4" />
                        Key Browser
                    </TabsTrigger>
                    <TabsTrigger value="slowlog" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Slow Log
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="browser" className="mt-0 flex-1 overflow-hidden">
                    <ResizablePanelGroup orientation="horizontal" className="h-full">
                        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                            <div className="h-full p-4">
                                <RedisKeyBrowser
                                    connectionId={connectionId ?? ""}
                                    onKeySelect={setSelectedKey}
                                    selectedKey={selectedKey ?? undefined}
                                />
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        <ResizablePanel defaultSize={70}>
                            {selectedKey ? (
                                <RedisDataViewer
                                    connectionId={connectionId ?? ""}
                                    selectedKey={selectedKey}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <EmptyState
                                        icon={<MousePointerClick className="h-5 w-5" />}
                                        title="No key selected"
                                        description="Pick a key from the browser on the left to inspect its value, type, and TTL."
                                    />
                                </div>
                            )}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </TabsContent>

                <TabsContent value="slowlog" className="flex-1 overflow-hidden p-4">
                    <RedisSlowLogViewer connectionId={connectionId ?? ""} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
