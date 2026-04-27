import { useState } from "react"
import { toast } from "sonner"
import { type QueryResult, usePlatform } from "../../contexts/PlatformContext"
import { type ResultsViewMode } from "../../stores/query-store"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Textarea } from "../ui/textarea"
import { Crosshair, MapPin } from "lucide-react"
import { ResultsViewer } from "./ResultsViewer"

/**
 * Fallback coordinates when geolocation is unavailable / denied.
 * Greenwich (0,0 was confusing for users — Greenwich is meaningful and visible
 * on every world map), so a "Use my location" button is preferred.
 */
const FALLBACK_LONGITUDE = "0"
const FALLBACK_LATITUDE = "51.4778"

export interface GeospatialQueryBuilderProps {
    connectionId: string | null
    databaseName: string | null
    collectionName: string | null
}

export function GeospatialQueryBuilder({
    connectionId,
    databaseName,
    collectionName,
}: GeospatialQueryBuilderProps): JSX.Element {
    const platform = usePlatform()
    const [field, setField] = useState("location")
    const [queryType, setQueryType] = useState<"near" | "within" | "intersects">("near")
    const [longitude, setLongitude] = useState(FALLBACK_LONGITUDE)
    const [latitude, setLatitude] = useState(FALLBACK_LATITUDE)
    const [maxDistance, setMaxDistance] = useState("1000")
    const [minDistance, setMinDistance] = useState("")
    const [polygonCoords, setPolygonCoords] = useState(
        "[\n  [-74.0, 40.7],\n  [-73.9, 40.7],\n  [-73.9, 40.8],\n  [-74.0, 40.8],\n  [-74.0, 40.7]\n]",
    )
    const [additionalFilter, setAdditionalFilter] = useState("{}")
    const [result, setResult] = useState<QueryResult | null>(null)
    const [viewMode, setViewMode] = useState<ResultsViewMode>("table")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleUseMyLocation = (): void => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            toast.error("Geolocation not available", {
                description: "Your browser does not support the geolocation API.",
            })
            return
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLongitude(pos.coords.longitude.toFixed(6))
                setLatitude(pos.coords.latitude.toFixed(6))
                toast.success("Location set")
            },
            (err) => {
                toast.error("Could not get your location", {
                    description: err.message,
                })
            },
            { timeout: 10_000, enableHighAccuracy: false },
        )
    }

    const handleExecute = (): void => {
        if (!connectionId || !databaseName || !collectionName) {
            return
        }

        setIsLoading(true)
        setError(null)

        let coordinates: number[]
        if (queryType === "near") {
            coordinates = [parseFloat(longitude), parseFloat(latitude)]
        } else {
            try {
                coordinates = JSON.parse(polygonCoords) as number[]
            } catch (_err) {
                setError("Invalid polygon coordinates JSON")
                setIsLoading(false)
                return
            }
        }

        let filter: Record<string, unknown> | undefined
        if (additionalFilter.trim() && additionalFilter.trim() !== "{}") {
            try {
                filter = JSON.parse(additionalFilter) as Record<string, unknown>
            } catch (_err) {
                setError("Invalid additional filter JSON")
                setIsLoading(false)
                return
            }
        }

        platform
            .executeGeospatialQuery({
                connectionId,
                databaseName,
                collectionName,
                field,
                geoType: queryType,
                coordinates,
                maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
                minDistance: minDistance ? parseInt(minDistance) : undefined,
                additionalFilter: filter,
            })
            .then((data) => {
                // Convert GeospatialQueryResult to QueryResult
                const queryResult: QueryResult = {
                    success: data.success,
                    documents: data.documents,
                    stats: {
                        executionTimeMs: data.executionTimeMs,
                        documentsReturned: data.documentsReturned,
                    },
                    error: data.error,
                }
                setResult(queryResult)
            })
            .catch((err: unknown) => {
                console.error("Failed to execute geospatial query:", err)
                setError(err instanceof Error ? err.message : "Query execution failed")
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    if (!connectionId || !databaseName || !collectionName) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <MapPin className="mr-2 h-5 w-5" />
                Select a collection to build geospatial queries
            </div>
        )
    }

    return (
        <div className="flex h-full">
            {/* Query Builder Panel */}
            <div className="w-96 border-r p-4 space-y-4 overflow-auto">
                <h2 className="text-lg font-semibold">Geospatial Query Builder</h2>

                <div className="space-y-2">
                    <Label htmlFor="field">Location Field</Label>
                    <Input
                        id="field"
                        value={field}
                        onChange={(e) => {
                            setField(e.target.value)
                        }}
                        placeholder="location"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="query-type">Query Type</Label>
                    <Select
                        value={queryType}
                        onValueChange={(v) => {
                            setQueryType(v as typeof queryType)
                        }}
                    >
                        <SelectTrigger id="query-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="near">$near (Point)</SelectItem>
                            <SelectItem value="within">$geoWithin (Polygon)</SelectItem>
                            <SelectItem value="intersects">$geoIntersects</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {queryType === "near" ? (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="0.000001"
                                    value={longitude}
                                    onChange={(e) => {
                                        setLongitude(e.target.value)
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="0.000001"
                                    value={latitude}
                                    onChange={(e) => {
                                        setLatitude(e.target.value)
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleUseMyLocation}
                                aria-label="Use device location for coordinates"
                            >
                                <Crosshair className="mr-2 h-4 w-4" />
                                Use my location
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max-distance">Max Distance (m)</Label>
                                <Input
                                    id="max-distance"
                                    type="number"
                                    value={maxDistance}
                                    onChange={(e) => {
                                        setMaxDistance(e.target.value)
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min-distance">Min Distance (m)</Label>
                                <Input
                                    id="min-distance"
                                    type="number"
                                    value={minDistance}
                                    onChange={(e) => {
                                        setMinDistance(e.target.value)
                                    }}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="polygon">Polygon Coordinates (JSON)</Label>
                        <Textarea
                            id="polygon"
                            value={polygonCoords}
                            onChange={(e) => {
                                setPolygonCoords(e.target.value)
                            }}
                            className="font-mono text-xs"
                            rows={8}
                        />
                        <div className="text-xs text-muted-foreground">
                            Format: [[lng1, lat1], [lng2, lat2], ...]
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="additional-filter">Additional Filter (JSON)</Label>
                    <Textarea
                        id="additional-filter"
                        value={additionalFilter}
                        onChange={(e) => {
                            setAdditionalFilter(e.target.value)
                        }}
                        className="font-mono text-xs"
                        rows={4}
                        placeholder='{"category": "restaurant"}'
                    />
                </div>

                {error && (
                    <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <Button onClick={handleExecute} disabled={isLoading} className="w-full">
                    {isLoading ? "Executing..." : "Execute Query"}
                </Button>
            </div>

            {/* Results Panel */}
            <div className="flex-1">
                <ResultsViewer result={result} viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
        </div>
    )
}
