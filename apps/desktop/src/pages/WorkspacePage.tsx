import { useParams } from "react-router-dom"
import { Braces, FileCode, Play, Save, Table2 } from "lucide-react"
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@dbland/ui"

export function WorkspacePage() {
    const { connectionId: _connectionId } = useParams()

    return (
        <div className="flex h-full flex-col">
            {/* Tabs bar */}
            <div className="flex items-center justify-between border-b px-2 py-1">
                <Tabs defaultValue="query1" className="w-full">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="query1" className="gap-2">
                                <FileCode className="h-4 w-4" />
                                Query 1
                            </TabsTrigger>
                            <TabsTrigger value="query2" className="gap-2">
                                <FileCode className="h-4 w-4" />
                                Query 2
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2">
                            <Button size="sm" className="gap-2">
                                <Play className="h-4 w-4" />
                                Run
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="query1" className="mt-0 flex-1">
                        <div className="flex h-full flex-col">
                            {/* Query editor placeholder */}
                            <div className="flex-1 border-b bg-muted/20 p-4">
                                <div className="h-full rounded border bg-background p-4 font-mono text-sm">
                                    <span className="text-muted-foreground">
                                        // Query editor will be here (Monaco)
                                    </span>
                                    <br />
                                    <span className="text-green-600">db</span>
                                    <span>.</span>
                                    <span className="text-blue-600">users</span>
                                    <span>.</span>
                                    <span className="text-yellow-600">find</span>
                                    <span>({"{"}</span>
                                    <span className="text-purple-600">"active"</span>
                                    <span>: </span>
                                    <span className="text-orange-600">true</span>
                                    <span>{"}"})</span>
                                </div>
                            </div>

                            {/* Results area */}
                            <div className="h-1/2 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Results: 0 documents (0ms)
                                    </span>
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                            <Table2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                            <Braces className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="h-full rounded border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                                    Run a query to see results
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="query2" className="mt-0">
                        <div className="p-4 text-center text-muted-foreground">Query 2 content</div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
