//! Input-validation helpers shared across IPC command handlers.
//!
//! In addition to the string validators below, this module exposes
//! `clamp_query_limit` — a single primitive every command that takes
//! a frontend-supplied row count uses, so the "hard ceiling on what we
//! pull across IPC in one shot" rule lives in one place rather than
//! being copy-pasted (or, worse, forgotten) across handlers.
//!
//! Every command that interpolates user-supplied identifiers
//! (database name, collection name, ObjectId) into a MongoDB-shell
//! query string passes those identifiers through one of these
//! validators first. The validators are deliberately strict — they
//! only allow the character set the GUI's pickers can already produce
//! — because the rejection set is what makes the interpolation safe.
//! If a value passes validation, there is nothing to escape inside the
//! `format!` site, and a query like
//!
//! ```text
//! format!(r#"db.{}.find({{"_id": {{"$oid": "{}"}}}})"#, name, id)
//! ```
//!
//! cannot be turned into a `db.x.dropDatabase()` injection by a hostile
//! frontend or a malformed call from a debug tool.

/// Clamp a frontend-supplied row count into `1..=max`, falling back to
/// `default` when the value is missing.
///
/// Every command that interpolates a `limit` into a query string or
/// passes it through to a driver call routes it through this. Three
/// reasons to centralise:
///
///   * Defence — a buggy or malicious frontend passing `i64::MAX`
///     would otherwise pull the whole table across IPC in one shot.
///   * Floor — `0` and negatives have surprising vendor-specific
///     meanings (Mongo treats `-N` as "limit and close cursor", which
///     is rarely what the user wanted); coercing to `1` keeps the
///     behaviour predictable.
///   * One place to change — the previous shape duplicated this
///     three-line `unwrap_or(...).clamp(1, MAX)` body across query and
///     profiler handlers, with fresh copy-paste mistakes waiting to
///     happen for every new handler.
pub fn clamp_query_limit(input: Option<i64>, default: i64, max: i64) -> i64 {
    input.unwrap_or(default).clamp(1, max)
}

#[cfg(test)]
mod clamp_query_limit_tests {
    use super::clamp_query_limit;

    #[test]
    fn unset_falls_back_to_default() {
        assert_eq!(clamp_query_limit(None, 100, 1000), 100);
    }

    #[test]
    fn within_range_passes_through() {
        assert_eq!(clamp_query_limit(Some(500), 100, 1000), 500);
    }

    #[test]
    fn over_max_is_clamped() {
        assert_eq!(clamp_query_limit(Some(i64::MAX), 100, 1000), 1000);
    }

    #[test]
    fn zero_or_negative_is_clamped_to_one() {
        assert_eq!(clamp_query_limit(Some(0), 100, 1000), 1);
        assert_eq!(clamp_query_limit(Some(-42), 100, 1000), 1);
    }
}

/// Reject anything that doesn't look like a 24-hex MongoDB ObjectId.
///
/// The id appears in `format!("\"$oid\": \"{}\"", id)` sites; without
/// this guard a value containing `"}` could break out of the JSON
/// literal and rewrite the surrounding query.
pub fn validate_object_id(id: &str) -> Result<(), String> {
    if id.len() != 24 || !id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid ObjectId: must be 24 hexadecimal characters".to_string());
    }
    Ok(())
}

/// Reject collection names that contain shell-meaningful characters.
///
/// MongoDB itself accepts a wider character set, but the GUI's
/// collection picker only ever produces names from the safe set, so
/// this is the same set the rest of the app already commits to. A
/// rejected value never reaches the surrounding `db.{}.find(...)` and
/// cannot inject extra commands.
pub fn validate_collection_name(name: &str) -> Result<(), String> {
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

/// Same shape as `validate_collection_name`, applied to database
/// names. MongoDB has slightly tighter rules on database names than
/// collections (no `/`, `\`, `.`, `"`, ` `, `*`, `<`, `>`, `:`, `|`,
/// `?`, `$`), but the picker side already constrains things to the
/// alphanumeric + `_` + `-` subset, which is a strict subset of what
/// MongoDB allows.
pub fn validate_database_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Database name must not be empty".to_string());
    }
    let safe = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
    if !safe || name.starts_with('$') {
        return Err(
            "Database name may only contain letters, digits, '_' and '-'".to_string(),
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn object_id_accepts_24_hex() {
        assert!(validate_object_id("507f1f77bcf86cd799439011").is_ok());
        assert!(validate_object_id("ABCDEF0123456789abcdef01").is_ok());
    }

    #[test]
    fn object_id_rejects_wrong_length_or_non_hex() {
        assert!(validate_object_id("").is_err());
        assert!(validate_object_id("507f").is_err());
        assert!(validate_object_id(&"a".repeat(25)).is_err());
        assert!(validate_object_id(&"g".repeat(24)).is_err());
    }

    #[test]
    fn collection_name_accepts_safe_inputs() {
        assert!(validate_collection_name("users").is_ok());
        assert!(validate_collection_name("orders.line_items").is_ok());
        assert!(validate_collection_name("kebab-case_42").is_ok());
    }

    #[test]
    fn collection_name_rejects_metacharacters_and_empty() {
        assert!(validate_collection_name("").is_err());
        assert!(validate_collection_name("users; drop").is_err());
        assert!(validate_collection_name("foo\"bar").is_err());
        assert!(validate_collection_name("$cmd").is_err());
    }

    #[test]
    fn database_name_rejects_dots_and_metacharacters() {
        assert!(validate_database_name("appdata").is_ok());
        assert!(validate_database_name("with-dash_and_underscore").is_ok());
        // MongoDB itself disallows `.` in db names, so this validator does too.
        assert!(validate_database_name("foo.bar").is_err());
        assert!(validate_database_name("$external").is_err());
        assert!(validate_database_name("").is_err());
    }
}
