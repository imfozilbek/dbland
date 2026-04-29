use crate::{validate_collection_name, validate_database_name, validate_object_id, AppState};
use serde_json::Value;
use std::sync::Arc;
use tauri::{command, State};

/// Get a single document by ID
#[command]
pub async fn get_document(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
    document_id: String,
) -> Result<Value, String> {
    validate_database_name(&database_name)?;
    validate_collection_name(&collection_name)?;
    validate_object_id(&document_id)?;
    // Build query to find document by _id
    let query = format!(r#"{{"_id": {{"$oid": "{}"}}}}"#, document_id);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("Document not found".to_string());
    }

    Ok(result.documents[0].clone())
}

/// Update a document
#[command]
pub async fn update_document(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
    document_id: String,
    update: Value,
) -> Result<bool, String> {
    validate_database_name(&database_name)?;
    validate_collection_name(&collection_name)?;
    validate_object_id(&document_id)?;
    // Build update query
    let update_doc = serde_json::to_string(&update).map_err(|e| crate::redact_error(e.to_string()))?;
    let query = format!(
        r#"db.{}.updateOne({{"_id": {{"$oid": "{}"}}}}, {{"$set": {}}})"#,
        collection_name, document_id, update_doc
    );

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(result.success)
}

/// Delete a document
#[command]
pub async fn delete_document(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
    document_id: String,
) -> Result<bool, String> {
    validate_database_name(&database_name)?;
    validate_collection_name(&collection_name)?;
    validate_object_id(&document_id)?;
    // Build delete query
    let query = format!(
        r#"db.{}.deleteOne({{"_id": {{"$oid": "{}"}}}})"#,
        collection_name, document_id
    );

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(result.success)
}

/// Clone a document (insert copy with new _id)
#[command]
pub async fn clone_document(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
    document_id: String,
) -> Result<String, String> {
    validate_database_name(&database_name)?;
    validate_collection_name(&collection_name)?;
    validate_object_id(&document_id)?;
    // First, get the document
    let get_query = format!(r#"{{"_id": {{"$oid": "{}"}}}}"#, document_id);

    let result = state
        .pool
        .execute_query(&connection_id, &database_name, Some(&collection_name), &get_query)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if result.documents.is_empty() {
        return Err("Document not found".to_string());
    }

    // Clone document and remove _id
    let mut doc_value = result.documents[0].clone();
    if let Some(doc_map) = doc_value.as_object_mut() {
        doc_map.remove("_id");
    }

    // Insert the cloned document
    let doc_str = serde_json::to_string(&doc_value).map_err(|e| crate::redact_error(e.to_string()))?;
    let insert_query = format!(r#"db.{}.insertOne({})"#, collection_name, doc_str);

    let insert_result = state
        .pool
        .execute_query(
            &connection_id,
            &database_name,
            Some(&collection_name),
            &insert_query,
        )
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    if insert_result.success && !insert_result.documents.is_empty() {
        // Extract new _id from result
        if let Some(id) = insert_result.documents[0].get("_id") {
            return Ok(id.to_string());
        }
    }

    Err("Failed to clone document".to_string())
}
