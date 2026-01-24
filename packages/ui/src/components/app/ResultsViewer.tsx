import { Grid, Table, TreePine } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader } from "../ui/card"
import type { QueryResult } from "../../contexts/PlatformContext"
import type { ResultsViewMode } from "../../stores/query-store"
import { ResultsTable } from "./ResultsTable"
import { ResultsJson } from "./ResultsJson"
import { ResultsTree } from "./ResultsTree"

export interface ResultsViewerProps {
    result: QueryResult | null
    viewMode: ResultsViewMode
    onViewModeChange: (mode: ResultsViewMode) => void
    onEditDocument?: (documentId: string) => void
    onCloneDocument?: (documentId: string) => void
    onDeleteDocument?: (documentId: string) => void
}

/**
 * Results viewer component with table, JSON, and tree views.
 * Displays query execution stats and results in multiple formats.
 */
export function ResultsViewer({
    result,
    viewMode,
    onViewModeChange,
    onEditDocument,
    onCloneDocument,
    onDeleteDocument,
}: ResultsViewerProps): JSX.Element {
    if (!result) {
        return (
            <Card className="h-full flex items-center justify-center">
                <CardContent className="text-muted-foreground text-center py-8">
                    <div className="animate-fadeIn">
                        <p className="text-sm">Run a query to see results</p>
                        <p className="text-xs mt-1 opacity-70">Press Cmd+Enter to execute</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!result.success) {
        return (
            <Card className="h-full animate-fadeIn">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="destructive">Error</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-destructive font-mono text-sm whitespace-pre-wrap bg-destructive/5 rounded-md p-3 border border-destructive/20">
                        {result.error ?? "Unknown error occurred"}
                    </div>
                </CardContent>
            </Card>
        )
    }

    const { stats, documents, cursor } = result

    return (
        <Card className="h-full flex flex-col animate-fadeIn">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="success">Success</Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                                {stats.documentsReturned}
                            </span>
                            <span>{stats.documentsReturned === 1 ? "document" : "documents"}</span>
                            <span className="text-border">•</span>
                            <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                                {stats.executionTimeMs}ms
                            </span>
                        </div>
                        {cursor?.hasMore && (
                            <Badge variant="outline" className="text-xs">
                                More available
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <Tabs
                    value={viewMode}
                    onValueChange={(v) => {
                        onViewModeChange(v as ResultsViewMode)
                    }}
                    className="h-full flex flex-col"
                >
                    <TabsList className="mb-2">
                        <TabsTrigger value="table" className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            Table
                        </TabsTrigger>
                        <TabsTrigger value="json" className="flex items-center gap-2">
                            <Grid className="h-4 w-4" />
                            JSON
                        </TabsTrigger>
                        <TabsTrigger value="tree" className="flex items-center gap-2">
                            <TreePine className="h-4 w-4" />
                            Tree
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="table" className="flex-1 overflow-hidden">
                        <ResultsTable
                            documents={documents}
                            onEditDocument={onEditDocument}
                            onCloneDocument={onCloneDocument}
                            onDeleteDocument={onDeleteDocument}
                        />
                    </TabsContent>
                    <TabsContent value="json" className="flex-1 overflow-hidden">
                        <ResultsJson documents={documents} />
                    </TabsContent>
                    <TabsContent value="tree" className="flex-1 overflow-hidden">
                        <ResultsTree documents={documents} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
