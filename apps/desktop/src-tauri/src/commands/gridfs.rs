use crate::{validate_collection_name, validate_database_name, validate_object_id, AppState};
use base64::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

/// GridFS bucket names live in `db.{bucket}.files` / `{bucket}.chunks`,
/// so they end up interpolated into the same JS-shell strings as
/// regular collection names. Validate them with the same rules — and
/// reject embedded dots so the caller can't sneak a second collection
/// name in via `evil.bucket"; db.dropDatabase()`.
fn validate_bucket_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("GridFS bucket name must not be empty".to_string());
    }
    let safe = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
    if !safe || name.starts_with('$') {
        return Err(
            "GridFS bucket name may only contain letters, digits, '_' and '-'".to_string(),
        );
    }
    Ok(())
}

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
    validate_database_name(&database_name)?;
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());
    validate_bucket_name(&bucket_name)?;
    let collection_name = format!("{}.files", bucket_name);
    // After interpolation it's a `<bucket>.files` form; re-check
    // because the surrounding format!() then drops it into the JS.
    validate_collection_name(&collection_name)?;

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
        .map(|doc| {
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

            let length = doc.get("length").and_then(|v| v.as_i64()).unwrap_or(0);

            let chunk_size = doc.get("chunkSize").and_then(|v| v.as_i64()).unwrap_or(0);

            let upload_date = doc
                .get("uploadDate")
                .and_then(|v| v.get("$date").and_then(|d| d.as_str()))
                .unwrap_or("")
                .to_string();

            let md5 = doc.get("md5").and_then(|v| v.as_str()).map(String::from);

            let content_type = doc
                .get("contentType")
                .and_then(|v| v.as_str())
                .map(String::from);

            let metadata = doc.get("metadata").cloned();

            GridFSFile {
                id,
                filename,
                length,
                chunk_size,
                upload_date,
                md5,
                content_type,
                metadata,
            }
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
    validate_database_name(&database_name)?;
    validate_object_id(&file_id)?;
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());
    validate_bucket_name(&bucket_name)?;
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
    validate_database_name(&database_name)?;
    validate_object_id(&file_id)?;
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());
    validate_bucket_name(&bucket_name)?;

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
    validate_database_name(&database_name)?;
    validate_object_id(&file_id)?;
    let bucket_name = bucket.unwrap_or_else(|| "fs".to_string());
    validate_bucket_name(&bucket_name)?;

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

    // Write to disk. The `filename` here came from MongoDB metadata —
    // a hostile or compromised server could store a payload like
    // `../../etc/passwd` and turn this into a local-filesystem
    // overwrite the moment the user clicks Download. Strip every
    // path-separator and traversal segment from it before joining,
    // so we always land on a plain basename inside `save_path`.
    let safe_basename = sanitise_basename(filename);
    let full_path = if save_path.ends_with('/') || save_path.ends_with('\\') {
        format!("{}{}", save_path, safe_basename)
    } else {
        save_path.clone()
    };

    std::fs::write(&full_path, file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(full_path)
}

/// Drop directory components, traversal segments, and NUL bytes from
/// a server-supplied filename so it can be safely joined to the
/// user-chosen save directory. If the result would be empty (or
/// nothing but dots) we fall back to "download".
fn sanitise_basename(filename: &str) -> String {
    // Take the segment after the last `/` or `\`, then forbid `..`
    // and any remaining separators.
    let last_slash = filename.rfind(['/', '\\']);
    let trimmed = match last_slash {
        Some(idx) => &filename[idx + 1..],
        None => filename,
    };
    let cleaned: String = trimmed
        .chars()
        .filter(|c| *c != '\0' && *c != '/' && *c != '\\')
        .collect();
    if cleaned.is_empty() || cleaned == "." || cleaned == ".." {
        "download".to_string()
    } else {
        cleaned
    }
}

#[cfg(test)]
mod sanitise_basename_tests {
    use super::sanitise_basename;

    #[test]
    fn passes_a_plain_filename_through() {
        assert_eq!(sanitise_basename("report.pdf"), "report.pdf");
    }

    #[test]
    fn strips_unix_path_traversal() {
        assert_eq!(sanitise_basename("../../etc/passwd"), "passwd");
    }

    #[test]
    fn strips_windows_path_traversal() {
        assert_eq!(sanitise_basename(r"..\..\windows\system32\evil.dll"), "evil.dll");
    }

    #[test]
    fn falls_back_to_download_for_dotfiles_or_empty() {
        assert_eq!(sanitise_basename(""), "download");
        assert_eq!(sanitise_basename(".."), "download");
        assert_eq!(sanitise_basename("../"), "download");
    }

    #[test]
    fn drops_embedded_nul_bytes() {
        assert_eq!(sanitise_basename("ok\0evil"), "okevil");
    }
}
