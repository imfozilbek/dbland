import { useState } from "react"
import { useParams } from "react-router-dom"
import {
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
    usePlatform,
} from "@dbland/ui"
import { Database, Key, Clock } from "lucide-react"

export function RedisWorkspacePage(): JSX.Element {
    const { connectionId } = useParams()
    const platform = usePlatform()
    const [selectedKey, setSelectedKey] = useState<string | null>(null)

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b">
                <div className="flex items-center gap-2 px-4 py-3 text-sm">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Redis Connection:</span>
                    <span className="font-medium">{connectionId}</span>
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="browser" className="flex-1 flex flex-col">
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

                <TabsContent value="browser" className="flex-1 overflow-hidden mt-0">
                    <ResizablePanelGroup direction="horizontal" className="h-full">
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
                                    <p className="text-muted-foreground">
                                        Select a key to view its data
                                    </p>
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
