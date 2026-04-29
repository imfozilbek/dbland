use crate::AppState;
use serde_json::Value;
use std::sync::Arc;
use tauri::{command, State};

/// Reject anything that doesn't look like a 24-hex MongoDB ObjectId
/// before letting it reach a `format!("...$oid: \"{}\"...", id)` site.
///
/// Without this guard, a `document_id` containing `"` or `}` could
/// break out of the surrounding JSON literal — a user (or a compromised
/// frontend) could turn a `findOne({_id: ObjectId(...)})` into a
/// `findOne({}, $where: '…')` injection. The hex check leaves us
/// nothing to escape: any matched value is safe to interpolate.
fn validate_object_id(id: &str) -> Result<(), String> {
    if id.len() != 24 || !id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid ObjectId: must be 24 hexadecimal characters".to_string());
    }
    Ok(())
}

/// Reject collection names that contain shell-meaningful characters
/// before they reach a `db.{name}.findOne(...)` interpolation. MongoDB
/// itself accepts a wider character set than this — but anything we
/// don't already use in tests is fair game to forbid here, since the
/// only way it reaches this layer is via the GUI's collection picker
/// (which already enforces the safe set on display).
fn validate_collection_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Collection name must not be empty".to_string());
    }
    let safe = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-');
    if !safe || name.starts_with('$') {
        return Err(
            "Collection name may only contain letters, digits, '_', '.' and '-'".to_string(),
        );
    }
    Ok(())
}

/// Get a single document by ID
#[command]
pub async fn get_document(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    database_name: String,
    collection_name: String,
    document_id: String,
) -> Result<Value, String> {
    validate_object_id(&document_id)?;
    validate_collection_name(&collection_name)?;
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
    validate_object_id(&document_id)?;
    validate_collection_name(&collection_name)?;
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
    validate_object_id(&document_id)?;
    validate_collection_name(&collection_name)?;
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
    validate_object_id(&document_id)?;
    validate_collection_name(&collection_name)?;
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

#[cfg(test)]
mod validators {
    use super::{validate_collection_name, validate_object_id};

    #[test]
    fn object_id_accepts_24_hex() {
        assert!(validate_object_id("507f1f77bcf86cd799439011").is_ok());
        assert!(validate_object_id("ABCDEF0123456789abcdef01").is_ok());
    }

    #[test]
    fn object_id_rejects_wrong_length() {
        assert!(validate_object_id("").is_err());
        assert!(validate_object_id("507f").is_err());
        assert!(validate_object_id(&"a".repeat(25)).is_err());
    }

    #[test]
    fn object_id_rejects_non_hex_characters() {
        // Same length as a real id, but contains the JSON breakout chars.
        assert!(validate_object_id(&format!("\"}}{}", "a".repeat(21))).is_err());
        assert!(validate_object_id(&"g".repeat(24)).is_err());
    }

    #[test]
    fn collection_name_accepts_safe_inputs() {
        assert!(validate_collection_name("users").is_ok());
        assert!(validate_collection_name("orders.line_items").is_ok());
        assert!(validate_collection_name("kebab-case_42").is_ok());
    }

    #[test]
    fn collection_name_rejects_shell_metacharacters() {
        assert!(validate_collection_name("users; db.dropDatabase()").is_err());
        assert!(validate_collection_name("foo\"bar").is_err());
        assert!(validate_collection_name("$cmd").is_err());
    }

    #[test]
    fn collection_name_rejects_empty() {
        assert!(validate_collection_name("").is_err());
    }
}
