use crate::{validate_collection_name, validate_database_name, AppState};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::File;
use std::io::{BufReader, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{command, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportOptions {
    pub file_path: String,
    pub format: String, // "json", "csv", "bson"
    pub database_name: String,
    pub collection_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
    pub file_path: String,
    pub format: String, // "json", "csv", "bson"
    pub database_name: String,
    pub collection_name: String,
    pub query: Option<String>, // Optional filter query
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub success: bool,
    pub imported: u64,
    pub failed: u64,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success: bool,
    pub exported: u64,
    pub error: Option<String>,
}

/// Import data from file
#[command]
pub async fn import_data(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    options: ImportOptions,
) -> Result<ImportResult, String> {
    match options.format.as_str() {
        "json" => import_json(&state, &connection_id, &options).await,
        "csv" => Err("CSV import not yet implemented".to_string()),
        "bson" => Err("BSON import not yet implemented".to_string()),
        _ => Err(format!("Unsupported format: {}", options.format)),
    }
}

/// Export data to file
#[command]
pub async fn export_data(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    options: ExportOptions,
) -> Result<ExportResult, String> {
    match options.format.as_str() {
        "json" => export_json(&state, &connection_id, &options).await,
        "csv" => Err("CSV export not yet implemented".to_string()),
        "bson" => Err("BSON export not yet implemented".to_string()),
        _ => Err(format!("Unsupported format: {}", options.format)),
    }
}

async fn import_json(
    state: &State<'_, Arc<AppState>>,
    connection_id: &str,
    options: &ImportOptions,
) -> Result<ImportResult, String> {
    validate_database_name(&options.database_name)?;
    validate_collection_name(&options.collection_name)?;

    let file = File::open(&options.file_path).map_err(|e| crate::redact_error(e.to_string()))?;
    let reader = BufReader::new(file);

    let mut imported = 0u64;
    let mut failed = 0u64;
    let mut errors = Vec::new();

    // Read file content
    let content: Value = serde_json::from_reader(reader).map_err(|e| crate::redact_error(e.to_string()))?;

    // Handle both single document and array of documents
    let documents: Vec<Value> = if content.is_array() {
        content.as_array().unwrap().clone()
    } else {
        vec![content]
    };

    // Insert documents in chunks via the dedicated batch-insert path.
    //
    // The previous version built `db.<coll>.insertMany([...])` query
    // strings and round-tripped them through `execute_query`. The
    // MongoDB adapter's `execute_query` only handles `find`, so every
    // import landed in the error branch of `parse_find_query` ("Top-
    // level must be a JSON object") and silently reported "0 inserted,
    // N failed" with a confusing error message. The dedicated
    // `pool.insert_documents` path now goes straight to the driver's
    // native `insert_many` for MongoDB and refuses cleanly for Redis.
    const CHUNK_SIZE: usize = 100;
    for chunk in documents.chunks(CHUNK_SIZE) {
        let chunk_size = chunk.len() as u64;
        match state
            .pool
            .insert_documents(
                connection_id,
                &options.database_name,
                &options.collection_name,
                chunk.to_vec(),
            )
            .await
        {
            Ok(inserted) => {
                imported += inserted;
                if inserted < chunk_size {
                    failed += chunk_size - inserted;
                }
            }
            Err(e) => {
                failed += chunk_size;
                errors.push(crate::redact_error(e.to_string()));
            }
        }
    }

    Ok(ImportResult {
        success: failed == 0,
        imported,
        failed,
        errors,
    })
}

async fn export_json(
    state: &State<'_, Arc<AppState>>,
    connection_id: &str,
    options: &ExportOptions,
) -> Result<ExportResult, String> {
    validate_database_name(&options.database_name)?;
    validate_collection_name(&options.collection_name)?;

    // Build query
    let query = options.query.clone().unwrap_or_else(|| "{}".to_string());

    // Execute query to get documents
    let result = state
        .pool
        .execute_query(
            connection_id,
            &options.database_name,
            Some(&options.collection_name),
            &query,
        )
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if !result.success {
        return Ok(ExportResult {
            success: false,
            exported: 0,
            error: result.error,
        });
    }

    // Write to file
    let path = PathBuf::from(&options.file_path);
    let mut file = File::create(path).map_err(|e| crate::redact_error(e.to_string()))?;

    let json = serde_json::to_string_pretty(&result.documents).map_err(|e| crate::redact_error(e.to_string()))?;
    file.write_all(json.as_bytes())
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(ExportResult {
        success: true,
        exported: result.documents.len() as u64,
        error: None,
    })
}
