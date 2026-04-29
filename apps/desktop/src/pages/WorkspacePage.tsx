import { useParams, useSearchParams } from "react-router-dom"
import { extractErrorMessage } from "@dbland/core"
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
    toast,
    useConfirm,
    useKeyboardShortcuts,
    usePlatform,
    useQueryStore,
    useT,
} from "@dbland/ui"
import { useEffect, useState } from "react"

interface QueryToolbarProps {
    isExecuting: boolean
    hasQuery: boolean
    showHistory: boolean
    showSavedQueries: boolean
    onExecute: () => void
    onFormat: () => void
    onSave: () => void
    onToggleHistory: () => void
    onToggleSaved: () => void
    onImport: () => void
    onExport: () => void
}

/**
 * Top bar of the queries tab — Run / Format / Save on the left,
 * History / Saved / Import / Export on the right. Extracted so
 * WorkspacePage stays under the cyclomatic-complexity cap.
 */
function QueryToolbar({
    isExecuting,
    hasQuery,
    showHistory,
    showSavedQueries,
    onExecute,
    onFormat,
    onSave,
    onToggleHistory,
    onToggleSaved,
    onImport,
    onExport,
}: QueryToolbarProps): JSX.Element {
    const t = useT()
    return (
        <div className="flex items-center justify-between border-b px-2 py-1">
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={onExecute}
                    disabled={isExecuting || !hasQuery}
                >
                    <Play className="h-4 w-4" />
                    {isExecuting ? t("workspace.toolbar.running") : t("workspace.toolbar.run")}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={onFormat}
                    disabled={isExecuting || !hasQuery}
                >
                    <Code2 className="h-4 w-4" />
                    {t("workspace.toolbar.format")}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={onSave}
                    disabled={!hasQuery}
                >
                    <Save className="h-4 w-4" />
                    {t("workspace.toolbar.save")}
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={showHistory ? "default" : "outline"}
                    className="gap-2"
                    onClick={onToggleHistory}
                >
                    <History className="h-4 w-4" />
                    {t("workspace.toolbar.history")}
                </Button>
                <Button
                    size="sm"
                    variant={showSavedQueries ? "default" : "outline"}
                    className="gap-2"
                    onClick={onToggleSaved}
                >
                    <BookMarked className="h-4 w-4" />
                    {t("workspace.toolbar.saved")}
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={onImport}>
                    <FileUp className="h-4 w-4" />
                    {t("workspace.toolbar.import")}
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={onExport}>
                    <FileDown className="h-4 w-4" />
                    {t("workspace.toolbar.export")}
                </Button>
            </div>
        </div>
    )
}

interface QueriesTabProps {
    connectionId: string | null
    activeQuery: string
    queryLanguage: "mongodb" | "redis"
    isExecuting: boolean
    currentResult: unknown
    resultsViewMode: "table" | "json" | "tree"
    showHistory: boolean
    showSavedQueries: boolean
    savedQueriesRefresh: number
    setQuery: (value: string) => void
    setResultsViewMode: (mode: "table" | "json" | "tree") => void
    formatQueryAction: () => void
    onExecute: () => void
    onSave: () => void
    onToggleHistory: () => void
    onToggleSaved: () => void
    onImport: () => void
    onExport: () => void
    onLoadHistoryQuery: (q: string) => void
    onLoadSavedQuery: (q: SavedQuery) => void
    onEditDocument: (id: string) => void
    onCloneDocument: (id: string) => void
    onDeleteDocument: (id: string) => void
}

function QueriesTab(props: QueriesTabProps): JSX.Element {
    return (
        <div className="flex h-full flex-col">
            <QueryToolbar
                isExecuting={props.isExecuting}
                hasQuery={!!props.activeQuery.trim()}
                showHistory={props.showHistory}
                showSavedQueries={props.showSavedQueries}
                onExecute={props.onExecute}
                onFormat={props.formatQueryAction}
                onSave={props.onSave}
                onToggleHistory={props.onToggleHistory}
                onToggleSaved={props.onToggleSaved}
                onImport={props.onImport}
                onExport={props.onExport}
            />

            <ResizablePanelGroup orientation="horizontal" className="flex-1">
                <ResizablePanel
                    defaultSize={props.showHistory || props.showSavedQueries ? 70 : 100}
                    minSize={30}
                >
                    <div className="flex h-full flex-col">
                        <div className="flex-1 border-b p-4">
                            <QueryEditor
                                value={props.activeQuery}
                                onChange={props.setQuery}
                                onExecute={props.onExecute}
                                language={props.queryLanguage}
                                readOnly={props.isExecuting}
                                height="100%"
                            />
                        </div>
                        <div className="h-1/2 p-4">
                            <ResultsViewer
                                result={props.currentResult as never}
                                viewMode={props.resultsViewMode}
                                onViewModeChange={props.setResultsViewMode}
                                onEditDocument={props.onEditDocument}
                                onCloneDocument={props.onCloneDocument}
                                onDeleteDocument={props.onDeleteDocument}
                            />
                        </div>
                    </div>
                </ResizablePanel>

                {props.showHistory && (
                    <>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                            <QueryHistory
                                connectionId={props.connectionId}
                                onLoadQuery={props.onLoadHistoryQuery}
                            />
                        </ResizablePanel>
                    </>
                )}

                {props.showSavedQueries && (
                    <>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                            <SavedQueries
                                connectionId={props.connectionId}
                                onLoadQuery={props.onLoadSavedQuery}
                                refreshKey={props.savedQueriesRefresh}
                            />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    )
}

export function WorkspacePage(): JSX.Element {
    const t = useT()
    const { connectionId } = useParams()
    const [searchParams] = useSearchParams()
    const platform = usePlatform()
    const [confirm, confirmDialog] = useConfirm()

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
    // Bumped after a new query is saved so the SavedQueries panel refetches
    // without a full window reload.
    const [savedQueriesRefresh, setSavedQueriesRefresh] = useState(0)

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

    // Sync database/collection with the URL. We include `connectionId` in the
    // deps so that switching connections also resets the picks — without it,
    // navigating from `/workspace/A?db=mydb` to `/workspace/B` (no params)
    // would leave the old `mydb` selected, and the next query would try to
    // hit a database that doesn't exist on B.
    useEffect(() => {
        setSelectedDatabase(searchParams.get("db") || "test")
        setSelectedCollection(searchParams.get("collection") || "test")
    }, [searchParams, connectionId])

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
                toast.success(t("workspace.cloneDocSuccess"))
                // Re-execute query to refresh results
                executeQuery(connectionId, selectedDatabase, selectedCollection).catch(
                    (err: unknown) => {
                        console.error("Failed to refresh results:", err)
                    },
                )
            })
            .catch((err: unknown) => {
                console.error("Failed to clone document:", err)
                toast.error(t("workspace.cloneDocFailed"), {
                    description: extractErrorMessage(err) || t("common.unknownError"),
                })
            })
    }

    const handleDeleteDocument = async (documentId: string): Promise<void> => {
        if (!connectionId) {
            return
        }
        const confirmed = await confirm({
            title: t("workspace.deleteDocConfirmTitle"),
            description: t("workspace.deleteDocConfirmDescription", {
                db: selectedDatabase,
                coll: selectedCollection,
            }),
            confirmLabel: t("common.delete"),
            destructive: true,
        })
        if (!confirmed) {
            return
        }
        platform
            .deleteDocument(connectionId, selectedDatabase, selectedCollection, documentId)
            .then(() => {
                toast.success(t("workspace.deleteDocSuccess"))
                // Re-execute query to refresh results
                executeQuery(connectionId, selectedDatabase, selectedCollection).catch(
                    (err: unknown) => {
                        console.error("Failed to refresh results:", err)
                    },
                )
            })
            .catch((err: unknown) => {
                console.error("Failed to delete document:", err)
                toast.error(t("workspace.deleteDocFailed"), {
                    description: extractErrorMessage(err) || t("common.unknownError"),
                })
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
                            {t("workspace.tabs.queries")}
                        </TabsTrigger>
                        <TabsTrigger value="aggregation" className="gap-2">
                            <GitMerge className="h-4 w-4" />
                            {t("workspace.tabs.aggregation")}
                        </TabsTrigger>
                        <TabsTrigger value="indexes" className="gap-2">
                            <List className="h-4 w-4" />
                            {t("workspace.tabs.indexes")}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Database/Collection selector */}
                <div className="flex items-center gap-2 px-4 py-2 text-sm border-t bg-muted/20">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("workspace.databaseLabel")}</span>
                    <span className="font-medium">{selectedDatabase}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span className="text-muted-foreground">{t("workspace.collectionLabel")}</span>
                    <span className="font-medium">{selectedCollection}</span>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "queries" && (
                    <QueriesTab
                        connectionId={connectionId ?? null}
                        activeQuery={activeQuery}
                        queryLanguage={queryLanguage}
                        isExecuting={isExecuting}
                        currentResult={currentResult}
                        resultsViewMode={resultsViewMode}
                        showHistory={showHistory}
                        showSavedQueries={showSavedQueries}
                        savedQueriesRefresh={savedQueriesRefresh}
                        setQuery={setQuery}
                        setResultsViewMode={setResultsViewMode}
                        formatQueryAction={formatQueryAction}
                        onExecute={handleExecuteQuery}
                        onSave={handleSaveQuery}
                        onToggleHistory={() => {
                            setShowHistory(!showHistory)
                            if (!showHistory) {
                                setShowSavedQueries(false)
                            }
                        }}
                        onToggleSaved={() => {
                            setShowSavedQueries(!showSavedQueries)
                            if (!showSavedQueries) {
                                setShowHistory(false)
                            }
                        }}
                        onImport={() => {
                            setShowImportDialog(true)
                        }}
                        onExport={() => {
                            setShowExportDialog(true)
                        }}
                        onLoadHistoryQuery={handleLoadHistoryQuery}
                        onLoadSavedQuery={handleLoadSavedQuery}
                        onEditDocument={handleEditDocument}
                        onCloneDocument={handleCloneDocument}
                        onDeleteDocument={(id) => {
                            void handleDeleteDocument(id)
                        }}
                    />
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
                    // Targeted refetch — never reload the window. Doing so
                    // would lose the active query, scroll position, and
                    // every other piece of unsaved local state.
                    setSavedQueriesRefresh((n) => n + 1)
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

            {confirmDialog}
        </div>
    )
}
