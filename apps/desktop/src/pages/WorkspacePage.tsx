import { useParams } from "react-router-dom"
import { BookMarked, Code2, FileCode, History, Play, Save } from "lucide-react"
import {
    Button,
    QueryEditor,
    QueryHistory,
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
    ResultsViewer,
    SavedQueries,
    type SavedQuery,
    SaveQueryDialog,
    selectActiveQuery,
    selectCurrentResult,
    selectIsExecuting,
    selectQueryLanguage,
    selectResultsViewMode,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    useQueryStore,
} from "@dbland/ui"
import { useState } from "react"

export function WorkspacePage(): JSX.Element {
    const { connectionId } = useParams()
    const [showHistory, setShowHistory] = useState(false)
    const [showSavedQueries, setShowSavedQueries] = useState(false)
    const [showSaveDialog, setShowSaveDialog] = useState(false)

    // Query store
    const activeQuery = useQueryStore(selectActiveQuery)
    const queryLanguage = useQueryStore(selectQueryLanguage)
    const isExecuting = useQueryStore(selectIsExecuting)
    const currentResult = useQueryStore(selectCurrentResult)
    const resultsViewMode = useQueryStore(selectResultsViewMode)

    const setQuery = useQueryStore((state) => state.setQuery)
    const executeQuery = useQueryStore((state) => state.executeQuery)
    const setResultsViewMode = useQueryStore((state) => state.setResultsViewMode)
    const formatQueryAction = useQueryStore((state) => state.formatQuery)

    const handleExecuteQuery = (): void => {
        if (!connectionId) {
            return
        }
        // Execute query without database/collection for now
        // TODO: Get database and collection from context/state
        executeQuery(connectionId).catch((err: unknown) => {
            console.error("Failed to execute query:", err)
        })
    }

    const handleLoadHistoryQuery = (query: string): void => {
        setQuery(query)
    }

    const handleLoadSavedQuery = (savedQuery: SavedQuery): void => {
        setQuery(savedQuery.query)
    }

    const handleSaveQuery = (): void => {
        if (!activeQuery.trim()) {
            return
        }
        setShowSaveDialog(true)
    }

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
                        </TabsList>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={handleExecuteQuery}
                                disabled={isExecuting || !activeQuery.trim()}
                            >
                                <Play className="h-4 w-4" />
                                {isExecuting ? "Running..." : "Run"}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={formatQueryAction}
                                disabled={isExecuting || !activeQuery.trim()}
                            >
                                <Code2 className="h-4 w-4" />
                                Format
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={handleSaveQuery}
                                disabled={!activeQuery.trim()}
                            >
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant={showHistory ? "default" : "outline"}
                                className="gap-2"
                                onClick={() => {
                                    setShowHistory(!showHistory)
                                    if (!showHistory) {
                                        setShowSavedQueries(false)
                                    }
                                }}
                            >
                                <History className="h-4 w-4" />
                                History
                            </Button>
                            <Button
                                size="sm"
                                variant={showSavedQueries ? "default" : "outline"}
                                className="gap-2"
                                onClick={() => {
                                    setShowSavedQueries(!showSavedQueries)
                                    if (!showSavedQueries) {
                                        setShowHistory(false)
                                    }
                                }}
                            >
                                <BookMarked className="h-4 w-4" />
                                Saved
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="query1" className="mt-0 flex-1">
                        <ResizablePanelGroup direction="horizontal" className="h-full">
                            <ResizablePanel
                                defaultSize={showHistory || showSavedQueries ? 70 : 100}
                                minSize={30}
                            >
                                <div className="flex h-full flex-col">
                                    {/* Query editor */}
                                    <div className="flex-1 border-b p-4">
                                        <QueryEditor
                                            value={activeQuery}
                                            onChange={setQuery}
                                            onExecute={handleExecuteQuery}
                                            language={queryLanguage}
                                            readOnly={isExecuting}
                                            height="100%"
                                        />
                                    </div>

                                    {/* Results area */}
                                    <div className="h-1/2 p-4">
                                        <ResultsViewer
                                            result={currentResult}
                                            viewMode={resultsViewMode}
                                            onViewModeChange={setResultsViewMode}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>

                            {showHistory && (
                                <>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                                        <QueryHistory
                                            connectionId={connectionId ?? null}
                                            onLoadQuery={handleLoadHistoryQuery}
                                        />
                                    </ResizablePanel>
                                </>
                            )}

                            {showSavedQueries && (
                                <>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                                        <SavedQueries
                                            connectionId={connectionId ?? null}
                                            onLoadQuery={handleLoadSavedQuery}
                                        />
                                    </ResizablePanel>
                                </>
                            )}
                        </ResizablePanelGroup>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Save Query Dialog */}
            <SaveQueryDialog
                open={showSaveDialog}
                onOpenChange={setShowSaveDialog}
                connectionId={connectionId ?? ""}
                query={activeQuery}
                language={queryLanguage}
                onSaved={() => {
                    // Refresh saved queries if panel is open
                    if (showSavedQueries) {
                        window.location.reload()
                    }
                }}
            />
        </div>
    )
}
