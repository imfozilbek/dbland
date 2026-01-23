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
                    <p>Run a query to see results</p>
                </CardContent>
            </Card>
        )
    }

    if (!result.success) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="destructive">Error</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-destructive font-mono text-sm whitespace-pre-wrap">
                        {result.error ?? "Unknown error occurred"}
                    </div>
                </CardContent>
            </Card>
        )
    }

    const { stats, documents, cursor } = result

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant="success" className="bg-green-500/10 text-green-500">
                            Success
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {stats.documentsReturned}{" "}
                            {stats.documentsReturned === 1 ? "document" : "documents"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            • {stats.executionTimeMs}ms
                        </span>
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
