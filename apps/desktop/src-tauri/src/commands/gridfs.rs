use crate::AppState;
use base64::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GridFSFile {
    pub id: String,
    pub filename: String,
    pub length: i64,
    pub chunk_size: i64,
    pub upload_date: String,
    pub md5: Option<String>,
    pub content_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// List GridFS files from a bucket
#[tauri::command]
pub async fn list_gridfs_files(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    bucket: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<GridFSFile>, String> {
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());
    let collection_name = format!("{}.files", bucket_name);

    // Build query with optional limit
    let query = if let Some(limit_val) = limit {
        format!(r#"db.getSiblingDB("{}").getCollection("{}").find({{}}).limit({})"#, database_name, collection_name, limit_val)
    } else {
        format!(r#"db.getSiblingDB("{}").getCollection("{}").find({{}})"#, database_name, collection_name)
    };

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    let files = result
        .documents
        .into_iter()
        .filter_map(|doc| {
            let id = doc
                .get("_id")
                .and_then(|v| v.get("$oid").and_then(|o| o.as_str()))
                .unwrap_or("unknown")
                .to_string();

            let filename = doc
                .get("filename")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();

            let length = doc
                .get("length")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            let chunk_size = doc
                .get("chunkSize")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            let upload_date = doc
                .get("uploadDate")
                .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
                .unwrap_or("")
                .to_string();

            let md5 = doc
                .get("md5")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let content_type = doc
                .get("contentType")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let metadata = doc.get("metadata").cloned();

            Some(GridFSFile {
                id,
                filename,
                length,
                chunk_size,
                upload_date,
                md5,
                content_type,
                metadata,
            })
        })
        .collect();

    Ok(files)
}

/// Get metadata for a specific GridFS file
#[tauri::command]
pub async fn get_gridfs_file_metadata(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    file_id: String,
    bucket: Option<String>,
) -> Result<GridFSFile, String> {
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());
    let collection_name = format!("{}.files", bucket_name);

    let query = format!(
        r#"db.getSiblingDB("{}").getCollection("{}").findOne({{ _id: ObjectId("{}") }})"#,
        database_name, collection_name, file_id
    );

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("File not found".to_string());
    }

    let doc = &result.documents[0];

    let id = doc
        .get("_id")
        .and_then(|v| v.get("$oid").and_then(|o| o.as_str()))
        .unwrap_or("unknown")
        .to_string();

    let filename = doc
        .get("filename")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let length = doc
        .get("length")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let chunk_size = doc
        .get("chunkSize")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    let upload_date = doc
        .get("uploadDate")
        .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
        .unwrap_or("")
        .to_string();

    let md5 = doc
        .get("md5")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let content_type = doc
        .get("contentType")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let metadata = doc.get("metadata").cloned();

    Ok(GridFSFile {
        id,
        filename,
        length,
        chunk_size,
        upload_date,
        md5,
        content_type,
        metadata,
    })
}

/// Delete a GridFS file (removes from both files and chunks collections)
#[tauri::command]
pub async fn delete_gridfs_file(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    file_id: String,
    bucket: Option<String>,
) -> Result<(), String> {
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());

    // Delete from files collection
    let files_collection = format!("{}.files", bucket_name);
    let delete_file_query = format!(
        r#"db.getSiblingDB("{}").getCollection("{}").deleteOne({{ _id: ObjectId("{}") }})"#,
        database_name, files_collection, file_id
    );

    state
        .pool
        .execute_query(&connection_id, &database_name, Some(&files_collection), &delete_file_query)
        .await
        .map_err(|e| crate::redact_error(format!("Failed to delete file: {}", e)))?;

    // Delete from chunks collection
    let chunks_collection = format!("{}.chunks", bucket_name);
    let delete_chunks_query = format!(
        r#"db.getSiblingDB("{}").getCollection("{}").deleteMany({{ files_id: ObjectId("{}") }})"#,
        database_name, chunks_collection, file_id
    );

    state
        .pool
        .execute_query(&connection_id, &database_name, Some(&chunks_collection), &delete_chunks_query)
        .await
        .map_err(|e| crate::redact_error(format!("Failed to delete chunks: {}", e)))?;

    Ok(())
}

/// Download a GridFS file (reassemble chunks and save to disk)
#[tauri::command]
pub async fn download_gridfs_file(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    file_id: String,
    save_path: String,
    bucket: Option<String>,
) -> Result<String, String> {
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());

    // Get file metadata first
    let files_collection = format!("{}.files", bucket_name);
    let metadata_query = format!(
        r#"db.getSiblingDB("{}").getCollection("{}").findOne({{ _id: ObjectId("{}") }})"#,
        database_name, files_collection, file_id
    );

    let metadata_result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&files_collection), &metadata_query)
        .await
        .map_err(|e| crate::redact_error(format!("Failed to get file metadata: {}", e)))?;

    if metadata_result.documents.is_empty() {
        return Err("File not found".to_string());
    }

    let file_doc = &metadata_result.documents[0];
    let filename = file_doc
        .get("filename")
        .and_then(|v| v.as_str())
        .unwrap_or("download");

    // Get all chunks for this file
    let chunks_collection = format!("{}.chunks", bucket_name);
    let chunks_query = format!(
        r#"db.getSiblingDB("{}").getCollection("{}").find({{ files_id: ObjectId("{}") }}).sort({{ n: 1 }})"#,
        database_name, chunks_collection, file_id
    );

    let chunks_result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&chunks_collection), &chunks_query)
        .await
        .map_err(|e| crate::redact_error(format!("Failed to get file chunks: {}", e)))?;

    // Reassemble chunks
    let mut file_data = Vec::new();
    for chunk_doc in chunks_result.documents {
        if let Some(data) = chunk_doc.get("data") {
            // Try to get binary data
            if let Some(binary_data) = data.get("$binary") {
                if let Some(base64_data) = binary_data.get("base64").and_then(|v| v.as_str()) {
                    // Decode base64 using modern API
                    match BASE64_STANDARD.decode(base64_data) {
                        Ok(bytes) => file_data.extend_from_slice(&bytes),
                        Err(e) => return Err(format!("Failed to decode chunk data: {}", e)),
                    }
                }
            }
        }
    }

    // Write to disk
    let full_path = if save_path.ends_with('/') || save_path.ends_with('\\') {
        format!("{}{}", save_path, filename)
    } else {
        save_path.clone()
    };

    std::fs::write(&full_path, file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(full_path)
}
