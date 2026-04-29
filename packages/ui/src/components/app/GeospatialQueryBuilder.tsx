import { useState } from "react"
import { extractErrorMessage } from "@dbland/core"
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
import { useT } from "../../i18n"

/**
 * Error tags returned by `parseNearCoordinates`. The caller maps each
 * tag to a localised user-facing message — keeps the parser pure and
 * lets translators own the wording in one place (the i18n file)
 * instead of inside this React component.
 */
type CoordError = "invalidCoordinates" | "outOfRangeCoordinates"

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

/**
 * Parse `near`-mode coordinates from the two text fields. Empty / garbage
 * inputs would otherwise pass NaN to the backend, which fails with an
 * opaque MongoDB error. Returns either `{ ok: true }` with the parsed
 * pair or `{ ok: false }` with a user-visible error string.
 */
/**
 * Parse and validate a polygon ring pasted by the user.
 *
 * Hoisted out of `handleExecute` to keep that function under the
 * project's 15-complexity ESLint cap and so the validation rule has a
 * named place to live. The rule mirrors the desktop-side
 * `validate_polygon_ring`: at least four `[lng, lat]` points (GeoJSON
 * close-the-ring rule) where every coordinate is a finite number.
 */
function parsePolygonRing(raw: string): [number, number][] | null {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }
    if (!Array.isArray(parsed) || parsed.length < 4) {
        return null
    }
    for (const point of parsed) {
        if (
            !Array.isArray(point) ||
            point.length !== 2 ||
            !point.every((n) => typeof n === "number" && Number.isFinite(n))
        ) {
            return null
        }
    }
    return parsed as [number, number][]
}

function parseNearCoordinates(
    longitude: string,
    latitude: string,
): { ok: true; coordinates: [number, number] } | { ok: false; error: CoordError } {
    const lon = parseFloat(longitude)
    const lat = parseFloat(latitude)
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
        return { ok: false, error: "invalidCoordinates" }
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        return { ok: false, error: "outOfRangeCoordinates" }
    }
    return { ok: true, coordinates: [lon, lat] }
}

export function GeospatialQueryBuilder({
    connectionId,
    databaseName,
    collectionName,
}: GeospatialQueryBuilderProps): JSX.Element {
    const t = useT()
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
            toast.error(t("geospatial.toasts.geolocationUnavailableTitle"), {
                description: t("geospatial.toasts.geolocationUnavailableDescription"),
            })
            return
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLongitude(pos.coords.longitude.toFixed(6))
                setLatitude(pos.coords.latitude.toFixed(6))
                toast.success(t("geospatial.toasts.locationSet"))
            },
            (err) => {
                toast.error(t("geospatial.toasts.locationFailedTitle"), {
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

        let coordinates: [number, number] | [number, number][]
        if (queryType === "near") {
            const parsed = parseNearCoordinates(longitude, latitude)
            if (!parsed.ok) {
                setError(t(`geospatial.errors.${parsed.error}`))
                setIsLoading(false)
                return
            }
            coordinates = parsed.coordinates
        } else {
            const ring = parsePolygonRing(polygonCoords)
            if (!ring) {
                setError(t("geospatial.errors.invalidPolygon"))
                setIsLoading(false)
                return
            }
            coordinates = ring
        }

        let filter: Record<string, unknown> | undefined
        if (additionalFilter.trim() && additionalFilter.trim() !== "{}") {
            try {
                filter = JSON.parse(additionalFilter) as Record<string, unknown>
            } catch (_err) {
                setError(t("geospatial.errors.invalidFilter"))
                setIsLoading(false)
                return
            }
        }

        // Same NaN-trap reasoning as for coordinates: silently sending NaN
        // through means an unhelpful backend error. Drop bad values to
        // `undefined` so the backend just omits the bound.
        const maxDistanceNum = maxDistance ? parseInt(maxDistance, 10) : undefined
        const minDistanceNum = minDistance ? parseInt(minDistance, 10) : undefined

        platform
            .executeGeospatialQuery({
                connectionId,
                databaseName,
                collectionName,
                field,
                geoType: queryType,
                coordinates,
                maxDistance: Number.isFinite(maxDistanceNum) ? maxDistanceNum : undefined,
                minDistance: Number.isFinite(minDistanceNum) ? minDistanceNum : undefined,
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
                setError(extractErrorMessage(err) || t("geospatial.errors.executionFailed"))
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    if (!connectionId || !databaseName || !collectionName) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <MapPin className="mr-2 h-5 w-5" />
                {t("geospatial.emptyPrompt")}
            </div>
        )
    }

    return (
        <div className="flex h-full">
            {/* Query Builder Panel */}
            <div className="w-96 border-r p-4 space-y-4 overflow-auto">
                <h2 className="text-lg font-semibold">{t("geospatial.title")}</h2>

                <div className="space-y-2">
                    <Label htmlFor="field">{t("geospatial.labels.field")}</Label>
                    <Input
                        id="field"
                        value={field}
                        onChange={(e) => {
                            setField(e.target.value)
                        }}
                        placeholder={t("geospatial.placeholders.field")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="query-type">{t("geospatial.labels.queryType")}</Label>
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
                                <Label htmlFor="longitude">
                                    {t("geospatial.labels.longitude")}
                                </Label>
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
                                <Label htmlFor="latitude">{t("geospatial.labels.latitude")}</Label>
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
                                aria-label={t("geospatial.useMyLocationAria")}
                            >
                                <Crosshair className="mr-2 h-4 w-4" />
                                {t("geospatial.useMyLocation")}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max-distance">
                                    {t("geospatial.labels.maxDistance")}
                                </Label>
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
                                <Label htmlFor="min-distance">
                                    {t("geospatial.labels.minDistance")}
                                </Label>
                                <Input
                                    id="min-distance"
                                    type="number"
                                    value={minDistance}
                                    onChange={(e) => {
                                        setMinDistance(e.target.value)
                                    }}
                                    placeholder={t("geospatial.placeholders.minDistance")}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="polygon">{t("geospatial.labels.polygon")}</Label>
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
                            {t("geospatial.polygonHelp")}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="additional-filter">
                        {t("geospatial.labels.additionalFilter")}
                    </Label>
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
                    {isLoading ? t("geospatial.executing") : t("geospatial.execute")}
                </Button>
            </div>

            {/* Results Panel */}
            <div className="flex-1">
                <ResultsViewer result={result} viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
        </div>
    )
}
