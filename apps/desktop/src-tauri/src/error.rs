//! IPC error sanitisation.
//!
//! Tauri commands return `Result<T, String>` to the frontend; whatever
//! string we put in the `Err` arm lands directly inside a user-visible
//! toast (and, when DevTools is open, in the JS console). The MongoDB
//! and Redis drivers' error messages can — and routinely do — include:
//!
//!   * the full connection URI with embedded `user:password@` userinfo,
//!     because `ClientOptions::parse(&uri)` echoes the input on parse
//!     failure;
//!   * `Authentication failed for user "alice"` lines that surface the
//!     user-supplied account name (sometimes the only "non-secret"
//!     identifier on a managed cluster, but still PII);
//!   * server-side schema fragments embedded in driver error strings.
//!
//! The codebase has a TS-side redactor in `ConsoleLogger`, but that's
//! irrelevant if the secret arrives over the IPC boundary already
//! inside the `Err` string — the toast renders the original message
//! before any TS code touches it. So we redact at the boundary.
//!
//! What we *don't* try to do here:
//!
//!   * Replace structured error types. That belongs in a follow-up
//!     where every command returns a `CommandError { code,
//!     safe_message }` enum and the frontend branches on `code`. This
//!     module is the minimum-viable defence for the current
//!     `Result<T, String>` shape.
//!   * Strip arbitrary PII. The redactor targets the patterns that
//!     unambiguously carry secrets; broader PII handling needs domain
//!     review.

use regex::Regex;
use std::sync::LazyLock;

/// Strip credentials and connection-string userinfo from an error
/// message before it crosses the Tauri IPC boundary.
///
/// Currently handles:
///
///   * `scheme://user:password@host` → `scheme://[REDACTED]@host` for
///     any URI shape the database drivers emit (mongodb, mongodb+srv,
///     redis, rediss).
///   * `password=...` and `password: ...` key-value pairs in driver
///     error formatters.
pub fn redact_error(message: impl Into<String>) -> String {
    let raw = message.into();

    // 1. URI userinfo: `scheme://user:password@host` — both halves of
    //    the userinfo are replaced even when only the password is the
    //    secret, because the user half can leak account names that
    //    carry meaningful access on managed databases.
    let uri_redacted = URI_USERINFO_RE.replace_all(&raw, "$scheme://[REDACTED]@");

    // 2. Inline `password=…` / `password: …` (case-insensitive,
    //    bounded by the next whitespace, comma, semicolon, or quote).
    let kv_redacted = PASSWORD_KV_RE.replace_all(&uri_redacted, "$key=[REDACTED]");

    kv_redacted.into_owned()
}

/// Userinfo segment of a URI. Captures the scheme so we can rewrite
/// in-place instead of stripping the whole URI. The character class
/// for the scheme matches RFC 3986 §3.1 (alpha + alnum + + - .) and
/// the userinfo allows anything up to the `@` separator.
static URI_USERINFO_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?P<scheme>[a-zA-Z][a-zA-Z0-9+.\-]*):\/\/[^@\s/]+@")
        .expect("URI_USERINFO_RE failed to compile")
});

/// `password=…` / `password: …` key-value pairs. Covers `password`
/// (case-insensitive); other secret keywords land in a follow-up.
static PASSWORD_KV_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?P<key>password)\s*[:=]\s*[^\s,;\x22']+")
        .expect("PASSWORD_KV_RE failed to compile")
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_mongodb_uri_userinfo() {
        let input =
            "Failed to parse URI: mongodb://alice:s3cret@cluster.example.com:27017/admin?ssl=true";
        let out = redact_error(input);
        assert!(!out.contains("alice"));
        assert!(!out.contains("s3cret"));
        assert!(out.contains("[REDACTED]"));
        assert!(out.contains("cluster.example.com:27017"));
    }

    #[test]
    fn redacts_redis_uri_userinfo() {
        let input = "ClientError: redis://:supersecret@redis.internal:6379 unreachable";
        let out = redact_error(input);
        assert!(!out.contains("supersecret"));
        assert!(out.contains("redis.internal:6379"));
    }

    #[test]
    fn redacts_password_kv_in_error_text() {
        let input = "Connection failed (password=hunter2, host=db.local)";
        let out = redact_error(input);
        assert!(!out.contains("hunter2"));
        assert!(out.contains("host=db.local"));
    }

    #[test]
    fn redacts_uppercase_password_key() {
        let input = "Diagnostic: PASSWORD=Sup3rS3cret was rejected";
        let out = redact_error(input);
        assert!(!out.contains("Sup3rS3cret"));
    }

    #[test]
    fn passes_innocuous_messages_through_unchanged() {
        let input = "Server selection timeout after 30s";
        assert_eq!(redact_error(input), input);
    }

    #[test]
    fn redacts_multiple_uris_in_a_single_message() {
        let input = "Replica set has [mongodb://a:1@h1, mongodb://b:2@h2] — primary unreachable";
        let out = redact_error(input);
        assert!(!out.contains(":1@"));
        assert!(!out.contains(":2@"));
        assert_eq!(out.matches("[REDACTED]").count(), 2);
    }

    #[test]
    fn does_not_redact_plain_url_without_userinfo() {
        let input = "Failed to fetch https://api.example.com/v1/health";
        // No userinfo, no `password=`, no change.
        assert_eq!(redact_error(input), input);
    }
}
