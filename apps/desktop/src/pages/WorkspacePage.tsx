import { useParams } from "react-router-dom"
import { FileCode, Play, Save, Code2 } from "lucide-react"
import {
    Button,
    QueryEditor,
    ResultsViewer,
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

export function WorkspacePage(): JSX.Element {
    const { connectionId } = useParams()

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
                            <Button size="sm" variant="outline" className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="query1" className="mt-0 flex-1">
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
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
