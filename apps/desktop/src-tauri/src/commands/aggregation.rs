use crate::{clamp_query_limit, validate_collection_name, validate_database_name, AppState};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

/// Hard ceiling on the synthetic `$limit` stage appended during stage
/// preview. The preview is meant to show the user what their pipeline
/// produces *up to this point* — a few hundred docs is plenty. A
/// frontend forgetting to set it (or passing `i64::MAX`) would
/// otherwise pull the entire intermediate result set across IPC.
const PREVIEW_LIMIT_MAX: i64 = 500;
const PREVIEW_LIMIT_DEFAULT: i64 = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregationPipelineStage {
    pub stage_type: String,
    pub stage_data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteAggregationRequest {
    pub connection_id: String,
    pub database_name: String,
    pub collection_name: String,
    pub pipeline: Vec<AggregationPipelineStage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregationResult {
    pub success: bool,
    pub documents: Vec<serde_json::Value>,
    pub execution_time_ms: u64,
    pub documents_returned: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewStageRequest {
    pub connection_id: String,
    pub database_name: String,
    pub collection_name: String,
    pub pipeline: Vec<AggregationPipelineStage>,
    pub stage_index: usize,
    pub limit: Option<i64>,
}

#[tauri::command]
pub async fn execute_aggregation_pipeline(
    state: State<'_, Arc<AppState>>,
    request: ExecuteAggregationRequest,
) -> Result<AggregationResult, String> {
    validate_database_name(&request.database_name)?;
    validate_collection_name(&request.collection_name)?;
    let start = std::time::Instant::now();

    // Build MongoDB aggregation pipeline
    let mut pipeline_stages = Vec::new();
    for stage in &request.pipeline {
        let stage_doc = serde_json::to_string(&stage.stage_data)
            .map_err(|e| format!("Failed to serialize stage: {}", e))?;
        pipeline_stages.push(format!("{{\"{}\": {}}}", stage.stage_type, stage_doc));
    }

    let pipeline_str = format!("[{}]", pipeline_stages.join(","));

    // Execute aggregation via pool
    let query = format!(
        "db.{}.aggregate({})",
        request.collection_name, pipeline_str
    );

    let result = state
        .pool
        .execute_query(
            &request.connection_id,
            &request.database_name,
            Some(&request.collection_name),
            &query,
        )
        .await
        .map_err(|e| crate::redact_error(format!("Aggregation failed: {}", e)))?;

    let execution_time_ms = start.elapsed().as_millis() as u64;
    let documents_returned = result.documents.len();

    Ok(AggregationResult {
        success: result.success,
        documents: result.documents,
        execution_time_ms,
        documents_returned,
        error: result.error,
    })
}

#[tauri::command]
pub async fn preview_pipeline_stage(
    state: State<'_, Arc<AppState>>,
    request: PreviewStageRequest,
) -> Result<AggregationResult, String> {
    validate_database_name(&request.database_name)?;
    validate_collection_name(&request.collection_name)?;
    let start = std::time::Instant::now();

    // Build pipeline up to the requested stage
    let stages_to_run: Vec<_> = request
        .pipeline
        .iter()
        .take(request.stage_index + 1)
        .collect();

    let mut pipeline_stages = Vec::new();
    for stage in stages_to_run {
        let stage_doc = serde_json::to_string(&stage.stage_data)
            .map_err(|e| format!("Failed to serialize stage: {}", e))?;
        pipeline_stages.push(format!("{{\"{}\": {}}}", stage.stage_type, stage_doc));
    }

    // Always append a $limit — this is a *preview*, not a full
    // pipeline run. The cap is non-negotiable so a forgetful frontend
    // can't accidentally pull the entire intermediate result set.
    let preview_limit = clamp_query_limit(request.limit, PREVIEW_LIMIT_DEFAULT, PREVIEW_LIMIT_MAX);
    pipeline_stages.push(format!("{{\"$limit\": {}}}", preview_limit));

    let pipeline_str = format!("[{}]", pipeline_stages.join(","));

    // Execute preview aggregation
    let query = format!(
        "db.{}.aggregate({})",
        request.collection_name, pipeline_str
    );

    let result = state
        .pool
        .execute_query(
            &request.connection_id,
            &request.database_name,
            Some(&request.collection_name),
            &query,
        )
        .await
        .map_err(|e| crate::redact_error(format!("Preview failed: {}", e)))?;

    let execution_time_ms = start.elapsed().as_millis() as u64;
    let documents_returned = result.documents.len();

    Ok(AggregationResult {
        success: result.success,
        documents: result.documents,
        execution_time_ms,
        documents_returned,
        error: result.error,
    })
}
