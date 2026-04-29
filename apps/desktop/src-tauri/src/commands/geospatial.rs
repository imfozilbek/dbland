use crate::{validate_collection_name, validate_database_name, AppState};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeospatialQueryRequest {
    pub connection_id: String,
    pub database_name: String,
    pub collection_name: String,
    pub geo_type: String,  // "near", "within", "intersects"
    pub field: String,  // Field name containing geo data
    pub coordinates: Vec<f64>,  // [lng, lat] for point, or array of points for polygon
    pub max_distance: Option<f64>,  // For $near (in meters)
    pub min_distance: Option<f64>,  // For $near (in meters)
    pub filter: Option<serde_json::Value>,  // Additional filters
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
            // Expecting coordinates as [[[lng, lat], [lng, lat], ...]] for polygon
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
