use crate::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::File;
use std::io::{BufReader, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{command, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportOptions {
    pub file_path: String,
    pub format: String, // "json", "csv", "bson"
    pub database_name: String,
    pub collection_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub file_path: String,
    pub format: String, // "json", "csv", "bson"
    pub database_name: String,
    pub collection_name: String,
    pub query: Option<String>, // Optional filter query
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub imported: u64,
    pub failed: u64,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

    // Insert documents in chunks
    const CHUNK_SIZE: usize = 100;
    for chunk in documents.chunks(CHUNK_SIZE) {
        let docs_json = serde_json::to_string(&chunk).map_err(|e| crate::redact_error(e.to_string()))?;
        let insert_query = format!(
            "db.{}.insertMany({})",
            options.collection_name, docs_json
        );

        match state
            .pool
            .execute_query(
                connection_id,
                &options.database_name,
                Some(&options.collection_name),
                &insert_query,
            )
            .await
        {
            Ok(result) => {
                if result.success {
                    imported += chunk.len() as u64;
                } else {
                    failed += chunk.len() as u64;
                    if let Some(err) = result.error {
                        errors.push(err);
                    }
                }
            }
            Err(e) => {
                failed += chunk.len() as u64;
                errors.push(e.to_string());
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
