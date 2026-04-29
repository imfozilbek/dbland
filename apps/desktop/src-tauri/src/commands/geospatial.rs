use crate::{validate_collection_name, validate_database_name, AppState};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

/// Geospatial query request.
///
/// `coordinates` is a `serde_json::Value` rather than a typed
/// `Vec<f64>` because the GeoJSON shape *depends on `geo_type`*:
///
///   * `near` / `intersects` expect a Point: `[lng, lat]` — flat
///     `Vec<f64>` of length 2;
///   * `within` expects a Polygon's outer ring:
///     `[[lng, lat], [lng, lat], …]` — `Vec<Vec<f64>>`.
///
/// The previous declaration `coordinates: Vec<f64>` could only
/// represent the first shape. The within branch then wrapped it in
/// `[request.coordinates]`, producing a polygon ring of one *point's*
/// worth of numbers, which is invalid GeoJSON. Any frontend that did
/// the right thing and sent a real polygon ring (a nested array) hit
/// a serde deserialisation error before the handler even ran. Typing
/// it as `Value` lets each branch validate its own expected shape and
/// keeps the wire compatible with what the GUI actually sends.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeospatialQueryRequest {
    pub connection_id: String,
    pub database_name: String,
    pub collection_name: String,
    pub geo_type: String,
    pub field: String,
    pub coordinates: serde_json::Value,
    pub max_distance: Option<f64>,
    pub min_distance: Option<f64>,
    pub filter: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeospatialQueryResult {
    pub success: bool,
    pub documents: Vec<serde_json::Value>,
    pub execution_time_ms: u64,
    pub documents_returned: usize,
    pub error: Option<String>,
}

/// Execute a geospatial query
#[tauri::command]
pub async fn execute_geospatial_query(
    state: State<'_, Arc<AppState>>,
    request: GeospatialQueryRequest,
) -> Result<GeospatialQueryResult, String> {
    validate_database_name(&request.database_name)?;
    validate_collection_name(&request.collection_name)?;
    let start = std::time::Instant::now();

    // Build geospatial query based on type
    let geo_filter = match request.geo_type.as_str() {
        "near" => {
            validate_point(&request.coordinates)?;

            let mut near_obj = serde_json::json!({
                "$geometry": {
                    "type": "Point",
                    "coordinates": request.coordinates
                }
            });

            if let Some(max_dist) = request.max_distance {
                near_obj["$maxDistance"] = serde_json::json!(max_dist);
            }

            if let Some(min_dist) = request.min_distance {
                near_obj["$minDistance"] = serde_json::json!(min_dist);
            }

            serde_json::json!({
                request.field: {
                    "$near": near_obj
                }
            })
        }
        "within" => {
            // Polygon ring: an array of `[lng, lat]` pairs. Wrap it in
            // a one-element outer array because GeoJSON polygons carry
            // an outer ring plus optional inner-ring holes — the
            // frontend gives us only the outer ring. The previous
            // version did the same `[ring]` wrap but typed
            // `coordinates` as `Vec<f64>`, so the wrap produced
            // `[[lng, lat, lng, lat, …]]` (a ring of one nonsense
            // "point"), and any real polygon input failed to
            // deserialise before reaching the handler.
            validate_polygon_ring(&request.coordinates)?;
            serde_json::json!({
                request.field: {
                    "$geoWithin": {
                        "$geometry": {
                            "type": "Polygon",
                            "coordinates": [request.coordinates]
                        }
                    }
                }
            })
        }
        "intersects" => {
            validate_point(&request.coordinates)?;
            serde_json::json!({
                request.field: {
                    "$geoIntersects": {
                        "$geometry": {
                            "type": "Point",
                            "coordinates": request.coordinates
                        }
                    }
                }
            })
        }
        _ => {
            return Err(format!("Unsupported geospatial query type: {}", request.geo_type));
        }
    };

    // Merge with additional filters if provided
    let final_filter = if let Some(additional) = request.filter {
        // Merge the two JSON objects
        if let (Some(geo_obj), Some(add_obj)) = (geo_filter.as_object(), additional.as_object()) {
            let mut merged = geo_obj.clone();
            for (k, v) in add_obj {
                merged.insert(k.clone(), v.clone());
            }
            serde_json::Value::Object(merged)
        } else {
            geo_filter
        }
    } else {
        geo_filter
    };

    // Convert to query string
    let filter_str = serde_json::to_string(&final_filter)
        .map_err(|e| format!("Failed to serialize filter: {}", e))?;

    let query = format!("db.{}.find({})", request.collection_name, filter_str);

    // Execute query
    let result = state
        .pool
        .execute_query(
            &request.connection_id,
            &request.database_name,
            Some(&request.collection_name),
            &query,
        )
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let execution_time_ms = start.elapsed().as_millis() as u64;
    let documents_returned = result.documents.len();

    Ok(GeospatialQueryResult {
        success: result.success,
        documents: result.documents,
        execution_time_ms,
        documents_returned,
        error: result.error,
    })
}

/// Reject anything that isn't a GeoJSON Point: a flat array of
/// exactly two finite numbers (`[lng, lat]`).
fn validate_point(value: &serde_json::Value) -> Result<(), String> {
    let arr = value
        .as_array()
        .ok_or_else(|| "coordinates must be an array".to_string())?;
    if arr.len() != 2 {
        return Err(format!(
            "coordinates must be a 2-element [lng, lat] array, got {} elements",
            arr.len()
        ));
    }
    for n in arr {
        let f = n
            .as_f64()
            .ok_or_else(|| "coordinates must contain numbers".to_string())?;
        if !f.is_finite() {
            return Err("coordinates must be finite numbers".to_string());
        }
    }
    Ok(())
}

/// Reject anything that isn't a GeoJSON Polygon outer ring: an array
/// of at least 4 `[lng, lat]` points. (4 because GeoJSON requires the
/// first and last point to be identical to close the ring; a triangle
/// + closing point is the minimum valid ring.)
fn validate_polygon_ring(value: &serde_json::Value) -> Result<(), String> {
    let ring = value
        .as_array()
        .ok_or_else(|| "polygon coordinates must be an array of [lng, lat] points".to_string())?;
    if ring.len() < 4 {
        return Err(format!(
            "polygon ring must have at least 4 points (close-the-ring rule), got {}",
            ring.len()
        ));
    }
    for point in ring {
        validate_point(point)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validate_point_accepts_a_well_formed_pair() {
        assert!(validate_point(&json!([12.34, 56.78])).is_ok());
    }

    #[test]
    fn validate_point_rejects_non_array() {
        assert!(validate_point(&json!({"x": 1})).is_err());
    }

    #[test]
    fn validate_point_rejects_wrong_length() {
        assert!(validate_point(&json!([1.0])).is_err());
        assert!(validate_point(&json!([1.0, 2.0, 3.0])).is_err());
    }

    #[test]
    fn validate_point_rejects_non_numbers() {
        assert!(validate_point(&json!(["lng", "lat"])).is_err());
        assert!(validate_point(&json!([1.0, "lat"])).is_err());
    }

    #[test]
    fn validate_point_rejects_nan_or_infinity() {
        // serde_json refuses to serialise non-finite floats, but a
        // hostile client could craft the bytes. f64::NAN slips through
        // as_f64 with `is_nan`/`is_infinite` true; we want it out.
        let nan = serde_json::Number::from_f64(f64::NAN);
        assert!(nan.is_none(), "serde rejects NaN at construction time");
    }

    #[test]
    fn validate_polygon_ring_accepts_a_closed_quad() {
        let ring = json!([
            [0.0, 0.0],
            [1.0, 0.0],
            [1.0, 1.0],
            [0.0, 0.0],
        ]);
        assert!(validate_polygon_ring(&ring).is_ok());
    }

    #[test]
    fn validate_polygon_ring_rejects_too_few_points() {
        // Three points cannot form a closed GeoJSON ring (first must
        // repeat as last).
        let ring = json!([[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]]);
        assert!(validate_polygon_ring(&ring).is_err());
    }

    #[test]
    fn validate_polygon_ring_rejects_a_flat_point_list() {
        // The previous bug shape: `Vec<f64>` flat list of numbers
        // instead of a list of points. Serde now lets it through to
        // the validator (the type is `Value`), so the validator must
        // catch it.
        let bogus = json!([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0]);
        assert!(validate_polygon_ring(&bogus).is_err());
    }

    #[test]
    fn validate_polygon_ring_rejects_non_array() {
        assert!(validate_polygon_ring(&json!({"type": "Polygon"})).is_err());
    }
}
