import { useParams, useSearchParams } from "react-router-dom"
import {
    BookMarked,
    Code2,
    Database,
    FileCode,
    FileDown,
    FileUp,
    GitMerge,
    History,
    List,
    Play,
    Save,
} from "lucide-react"
import {
    AggregationBuilder,
    Button,
    DocumentEditorDialog,
    ExportDialog,
    ImportDialog,
    IndexManager,
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
    TabsList,
    TabsTrigger,
    usePlatform,
    useQueryStore,
    useKeyboardShortcuts,
} from "@dbland/ui"
import { useState, useEffect } from "react"

export function WorkspacePage(): JSX.Element {
    const { connectionId } = useParams()
    const [searchParams] = useSearchParams()
    const platform = usePlatform()

    // Get database and collection from URL params or use defaults
    const [selectedDatabase, setSelectedDatabase] = useState<string>(
        searchParams.get("db") || "test",
    )
    const [selectedCollection, setSelectedCollection] = useState<string>(
        searchParams.get("collection") || "test",
    )

    const [showHistory, setShowHistory] = useState(false)
    const [showSavedQueries, setShowSavedQueries] = useState(false)
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [showExportDialog, setShowExportDialog] = useState(false)
    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>("queries")

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

    // Update database/collection when URL params change
    useEffect(() => {
        const db = searchParams.get("db")
        const coll = searchParams.get("collection")
        if (db) {
            setSelectedDatabase(db)
        }
        if (coll) {
            setSelectedCollection(coll)
        }
    }, [searchParams])

    const handleExecuteQuery = (): void => {
        if (!connectionId) {
            return
        }
        executeQuery(connectionId, selectedDatabase, selectedCollection).catch((err: unknown) => {
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

    const handleEditDocument = (documentId: string): void => {
        setEditingDocumentId(documentId)
    }

    const handleCloneDocument = (documentId: string): void => {
        if (!connectionId) {
            return
        }
        platform
            .cloneDocument(connectionId, selectedDatabase, selectedCollection, documentId)
            .then(() => {
                // Re-execute query to refresh results
                executeQuery(connectionId, selectedDatabase, selectedCollection).catch(
                    (err: unknown) => {
                        console.error("Failed to refresh results:", err)
                    },
                )
            })
            .catch((err: unknown) => {
                console.error("Failed to clone document:", err)
            })
    }

    const handleDeleteDocument = (documentId: string): void => {
        if (!connectionId) {
            return
        }
        // eslint-disable-next-line no-alert
        if (!confirm("Are you sure you want to delete this document?")) {
            return
        }
        platform
            .deleteDocument(connectionId, selectedDatabase, selectedCollection, documentId)
            .then(() => {
                // Re-execute query to refresh results
                executeQuery(connectionId, selectedDatabase, selectedCollection).catch(
                    (err: unknown) => {
                        console.error("Failed to refresh results:", err)
                    },
                )
            })
            .catch((err: unknown) => {
                console.error("Failed to delete document:", err)
            })
    }

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: "Enter",
            ctrlOrCmd: true,
            handler: handleExecuteQuery,
            description: "Execute query",
        },
        {
            key: "s",
            ctrlOrCmd: true,
            handler: handleSaveQuery,
            description: "Save query",
        },
        {
            key: "f",
            ctrlOrCmd: true,
            shift: true,
            handler: formatQueryAction,
            description: "Format query",
        },
    ])

    return (
        <div className="flex h-full flex-col">
            {/* Main Tabs */}
            <div className="border-b">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-12">
                        <TabsTrigger value="queries" className="gap-2">
                            <FileCode className="h-4 w-4" />
                            Queries
                        </TabsTrigger>
                        <TabsTrigger value="aggregation" className="gap-2">
                            <GitMerge className="h-4 w-4" />
                            Aggregation
                        </TabsTrigger>
                        <TabsTrigger value="indexes" className="gap-2">
                            <List className="h-4 w-4" />
                            Indexes
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Database/Collection selector */}
                <div className="flex items-center gap-2 px-4 py-2 text-sm border-t bg-muted/20">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Database:</span>
                    <span className="font-medium">{selectedDatabase}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span className="text-muted-foreground">Collection:</span>
                    <span className="font-medium">{selectedCollection}</span>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "queries" && (
                    <div className="flex h-full flex-col">
                        {/* Query toolbar */}
                        <div className="flex items-center justify-between border-b px-2 py-1">
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
                            </div>
                            <div className="flex items-center gap-2">
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
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => {
                                        setShowImportDialog(true)
                                    }}
                                >
                                    <FileUp className="h-4 w-4" />
                                    Import
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => {
                                        setShowExportDialog(true)
                                    }}
                                >
                                    <FileDown className="h-4 w-4" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        {/* Query editor and results */}
                        <ResizablePanelGroup orientation="horizontal" className="flex-1">
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
                                            onEditDocument={handleEditDocument}
                                            onCloneDocument={handleCloneDocument}
                                            onDeleteDocument={handleDeleteDocument}
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
                    </div>
                )}

                {activeTab === "aggregation" && (
                    <div className="h-full p-4">
                        <AggregationBuilder
                            connectionId={connectionId ?? ""}
                            databaseName={selectedDatabase}
                            collectionName={selectedCollection}
                        />
                    </div>
                )}

                {activeTab === "indexes" && (
                    <div className="h-full p-4">
                        <IndexManager
                            connectionId={connectionId ?? ""}
                            databaseName={selectedDatabase}
                            collectionName={selectedCollection}
                        />
                    </div>
                )}
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

            {/* Document Editor Dialog */}
            {editingDocumentId && (
                <DocumentEditorDialog
                    open={!!editingDocumentId}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingDocumentId(null)
                        }
                    }}
                    connectionId={connectionId ?? ""}
                    databaseName={selectedDatabase}
                    collectionName={selectedCollection}
                    documentId={editingDocumentId}
                    onSaved={() => {
                        // Re-execute query to refresh results
                        if (connectionId) {
                            executeQuery(connectionId, selectedDatabase, selectedCollection).catch(
                                (err: unknown) => {
                                    console.error("Failed to refresh results:", err)
                                },
                            )
                        }
                    }}
                />
            )}

            {/* Import Dialog */}
            <ImportDialog
                open={showImportDialog}
                onOpenChange={setShowImportDialog}
                connectionId={connectionId ?? ""}
                onImported={() => {
                    // Re-execute query to show imported data
                    if (connectionId) {
                        executeQuery(connectionId, selectedDatabase, selectedCollection).catch(
                            (err: unknown) => {
                                console.error("Failed to refresh results:", err)
                            },
                        )
                    }
                }}
            />

            {/* Export Dialog */}
            <ExportDialog
                open={showExportDialog}
                onOpenChange={setShowExportDialog}
                connectionId={connectionId ?? ""}
                databaseName={selectedDatabase}
                collectionName={selectedCollection}
            />
        </div>
    )
}
