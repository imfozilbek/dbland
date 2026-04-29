use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{command, State};

/// SCAN's `COUNT` is a server-side batch-size hint (Redis is free to
/// return more or fewer keys per cursor step). The hint isn't a
/// security boundary, but a frontend bug passing `usize::MAX` would
/// still hand a stupid number to the server. Clamp it to something
/// the schema browser actually uses for grouping.
const SCAN_COUNT_MAX: usize = 10_000;
const SCAN_COUNT_DEFAULT: usize = 100;

/// `SLOWLOG GET N` reads the last N entries from a circular buffer of
/// slow queries. The server-side default cap is 128 entries, but
/// passing a huge N still pulls the entire buffer across the wire and
/// across IPC. The slow-log panel virtualises and only ever shows the
/// most recent batch.
const SLOWLOG_LIMIT_MAX: usize = 1000;
const SLOWLOG_LIMIT_DEFAULT: usize = 10;

/// Wrap a user-supplied Redis argument in the double-quoted form the
/// redis-cli tokenizer recognises, with `\` and `"` escaped.
///
/// Without this, a perfectly valid key containing whitespace
/// (`"user profile:42"`) was passed through `format!("GET {}", key)`,
/// then split by the tokenizer into three argv entries — Redis replied
/// "wrong number of arguments for 'get' command" and the user had no
/// idea why their value was unreachable. With it, every path through
/// these commands hands Redis exactly one argument per logical input.
///
/// This is not a defence against Redis-level command injection (the
/// RESP framing already prevents that) — it's about preserving argv
/// boundaries for inputs that contain whitespace or quotes.
fn redis_quote(input: &str) -> String {
    let escaped = input.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{}\"", escaped)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanKeysRequest {
    pub connection_id: String,
    pub pattern: String,
    pub count: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanKeysResult {
    pub keys: Vec<String>,
    pub cursor: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetValueRequest {
    pub connection_id: String,
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum RedisValue {
    String { value: String },
    List { values: Vec<String> },
    Set { values: Vec<String> },
    ZSet { values: Vec<(String, f64)> },
    Hash { fields: Vec<(String, String)> },
    None,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetValueResult {
    pub value: RedisValue,
    pub ttl: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetTTLRequest {
    pub connection_id: String,
    pub key: String,
    pub seconds: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlowLogEntry {
    pub id: i64,
    pub timestamp: i64,
    pub duration_micros: i64,
    pub command: Vec<String>,
}

/// Hard ceiling on the SCAN walk. The user-supplied `count` is a
/// per-iteration *batch hint*, but we keep iterating until the cursor
/// wraps back to 0 — and an unbounded keyspace would produce an
/// unbounded response. Cap the total at something the key browser can
/// actually render and group.
const SCAN_TOTAL_CAP: usize = 10_000;

/// Scan Redis keys with pattern matching.
///
/// The previous implementation was broken in two stacked ways:
///
///   1. It issued exactly one `SCAN 0 …` command and never advanced
///      the cursor, so anything past the first batch was invisible —
///      a 100k-key cache returned at most ~100 entries.
///   2. It tried to read keys via `doc.get("key")` on the result,
///      but Redis SCAN returns `[cursor_str, [k1, k2, …]]` (a
///      two-element array), not an object with a `"key"` field.
///      `Value::get("key")` on an array returns `None`, so the result
///      was always `keys: []`. The key browser silently rendered
///      empty.
///
/// Now we iterate cursor-style until SCAN returns the sentinel `0`
/// cursor (or we hit `SCAN_TOTAL_CAP`), parse each batch's `[cursor,
/// [keys…]]` shape correctly, and return the accumulated keys plus
/// the final cursor (zero when fully drained, otherwise the cursor
/// the caller would resume from — which is what `ScanKeysResult.cursor`
/// always claimed to be but never was).
#[command]
pub async fn redis_scan_keys(
    state: State<'_, Arc<AppState>>,
    request: ScanKeysRequest,
) -> Result<ScanKeysResult, String> {
    let batch_hint = request
        .count
        .unwrap_or(SCAN_COUNT_DEFAULT)
        .clamp(1, SCAN_COUNT_MAX);
    let pattern = redis_quote(&request.pattern);

    let mut keys = Vec::new();
    let mut cursor: u64 = 0;

    loop {
        let result = state
            .pool
            .execute_query(
                &request.connection_id,
                "0",
                None,
                &format!("SCAN {} MATCH {} COUNT {}", cursor, pattern, batch_hint),
            )
            .await
            .map_err(|e| crate::redact_error(e.to_string()))?;

        // SCAN comes back as a single document of shape
        // `[cursor_string, [k1, k2, …]]`. Anything else is a protocol
        // mismatch we can't safely interpret.
        let doc = match result.documents.first() {
            Some(d) => d,
            None => break,
        };
        let outer = match doc.as_array() {
            Some(arr) if arr.len() == 2 => arr,
            _ => break,
        };

        cursor = outer[0]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        if let Some(batch) = outer[1].as_array() {
            for k in batch {
                if let Some(s) = k.as_str() {
                    keys.push(s.to_string());
                    if keys.len() >= SCAN_TOTAL_CAP {
                        return Ok(ScanKeysResult { keys, cursor });
                    }
                }
            }
        }

        if cursor == 0 {
            break;
        }
    }

    Ok(ScanKeysResult { keys, cursor })
}

/// Get Redis value by key.
///
/// The redis adapter returns each command's response as a single
/// JSON-converted document in `result.documents[0]`. The previous
/// parser misread the shape across every type branch — it tried
/// `doc.get("type")` / `doc.get("value")` / `doc.get("field")` as if
/// the responses were objects with named fields, but they're not:
///
///   * `TYPE k` → JSON string `"string"` (the bare type name)
///   * `TTL  k` → JSON number `123`
///   * `GET  k` → JSON string `"the value"`
///   * `LRANGE / SMEMBERS / ZRANGE / HGETALL` → JSON array of
///     alternating bulk strings (RESP2) or, for HGETALL only, a
///     JSON object (RESP3, which the adapter's `redis_value_to_json`
///     does support).
///
/// `Value::get("…")` on any of those returns `None`, so every branch
/// produced empty output. The Redis data viewer rendered nothing.
/// This rewrite reads each response shape directly with named
/// helpers and pairs the alternating arrays with `.chunks(2)` rather
/// than walking them as if they were row sets.
#[command]
pub async fn redis_get_value(
    state: State<'_, Arc<AppState>>,
    request: GetValueRequest,
) -> Result<GetValueResult, String> {
    let key = redis_quote(&request.key);

    let key_type = run_redis(&state, &request.connection_id, &format!("TYPE {}", key))
        .await?
        .as_str()
        .map(String::from)
        .unwrap_or_else(|| "none".to_string());

    let ttl = run_redis(&state, &request.connection_id, &format!("TTL {}", key))
        .await?
        .as_i64();

    let value = match key_type.as_str() {
        "string" => {
            let raw = run_redis(&state, &request.connection_id, &format!("GET {}", key)).await?;
            RedisValue::String {
                value: raw.as_str().unwrap_or("").to_string(),
            }
        }
        "list" => {
            let raw =
                run_redis(&state, &request.connection_id, &format!("LRANGE {} 0 -1", key)).await?;
            RedisValue::List {
                values: read_string_array(&raw),
            }
        }
        "set" => {
            let raw =
                run_redis(&state, &request.connection_id, &format!("SMEMBERS {}", key)).await?;
            RedisValue::Set {
                values: read_string_array(&raw),
            }
        }
        "zset" => {
            let raw = run_redis(
                &state,
                &request.connection_id,
                &format!("ZRANGE {} 0 -1 WITHSCORES", key),
            )
            .await?;
            // ZRANGE WITHSCORES under RESP2 returns a flat array of
            // alternating `[member, score, member, score, …]` where
            // every entry — including the score — is a bulk string.
            // The score-string parses to f64; if a future change
            // switches to RESP3 (which returns score as a real
            // number), the same `as_f64` fall-back via parse() still
            // works.
            let values: Vec<(String, f64)> = raw
                .as_array()
                .map(|arr| {
                    arr.chunks(2)
                        .filter_map(|c| {
                            let m = c.first()?.as_str()?.to_string();
                            let s = c.get(1)?;
                            let f = s
                                .as_f64()
                                .or_else(|| s.as_str().and_then(|t| t.parse().ok()))?;
                            Some((m, f))
                        })
                        .collect()
                })
                .unwrap_or_default();

            RedisValue::ZSet { values }
        }
        "hash" => {
            let raw =
                run_redis(&state, &request.connection_id, &format!("HGETALL {}", key)).await?;
            // HGETALL returns either an array of alternating
            // `[field, value, field, value, …]` (RESP2, today's
            // path) or a real `{field: value}` object (RESP3, which
            // the adapter's converter already supports).
            let fields: Vec<(String, String)> = if let Some(obj) = raw.as_object() {
                obj.iter()
                    .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                    .collect()
            } else if let Some(arr) = raw.as_array() {
                arr.chunks(2)
                    .filter_map(|c| {
                        let f = c.first()?.as_str()?.to_string();
                        let v = c.get(1)?.as_str()?.to_string();
                        Some((f, v))
                    })
                    .collect()
            } else {
                Vec::new()
            };

            RedisValue::Hash { fields }
        }
        _ => RedisValue::None,
    };

    Ok(GetValueResult { value, ttl })
}

/// Run a Redis command and return the single JSON document the
/// adapter wraps the response in. Centralises the four-line
/// "execute_query → unwrap first document → propagate redacted
/// error" boilerplate so each branch above reads as a single
/// statement.
async fn run_redis(
    state: &State<'_, Arc<AppState>>,
    connection_id: &str,
    command: &str,
) -> Result<serde_json::Value, String> {
    let result = state
        .pool
        .execute_query(connection_id, "0", None, command)
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;
    Ok(result.documents.into_iter().next().unwrap_or(serde_json::Value::Null))
}

/// Pull every string element out of a JSON array, dropping non-string
/// entries (which Redis bulk-string commands don't produce, but the
/// type system can't prove). Used by LRANGE and SMEMBERS.
fn read_string_array(raw: &serde_json::Value) -> Vec<String> {
    raw.as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

/// Set TTL for a Redis key
#[command]
pub async fn redis_set_ttl(
    state: State<'_, Arc<AppState>>,
    request: SetTTLRequest,
) -> Result<bool, String> {
    // Set TTL
    state
        .pool
        .execute_query(
            &request.connection_id,
            "0",
            None,
            &format!("EXPIRE {} {}", redis_quote(&request.key), request.seconds),
        )
        .await
        .map_err(|e| crate::redact_error(e.to_string()))?;

    Ok(true)
}

/// Get Redis slow log entries.
///
/// `SLOWLOG GET N` under RESP2 returns an outer array of slow-log
/// entries. Each entry is itself an array, positionally:
///
///   `[id_int, timestamp_int, duration_micros_int, [cmd, args…],
///     client_ip:port_str, client_name_str]`
///
/// The previous parser walked `result.documents` (a single-element
/// `Vec` that contained the *whole* outer array) and tried
/// `doc.get("id")` / `doc.get("timestamp")` etc. as if each
/// document were an object with named fields. None of those
/// `.get(name)` calls match an array, so every entry was filtered
/// out and the slow-log panel rendered empty.
///
/// This rewrite reads the response shape directly: peel the outer
/// array, then index each entry positionally for the four fields
/// we actually surface (id, timestamp, duration, command).
#[command]
pub async fn redis_slow_log(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
    count: Option<usize>,
) -> Result<Vec<SlowLogEntry>, String> {
    let raw = run_redis(
        &state,
        &connection_id,
        &format!(
            "SLOWLOG GET {}",
            count.unwrap_or(SLOWLOG_LIMIT_DEFAULT).clamp(1, SLOWLOG_LIMIT_MAX)
        ),
    )
    .await?;

    let entries: Vec<SlowLogEntry> = raw
        .as_array()
        .map(|outer| {
            outer
                .iter()
                .filter_map(|entry| {
                    let arr = entry.as_array()?;
                    Some(SlowLogEntry {
                        id: arr.first()?.as_i64()?,
                        timestamp: arr.get(1)?.as_i64()?,
                        duration_micros: arr.get(2)?.as_i64()?,
                        command: arr
                            .get(3)?
                            .as_array()?
                            .iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(entries)
}

#[cfg(test)]
mod redis_quote_tests {
    use super::redis_quote;

    #[test]
    fn wraps_simple_input_in_double_quotes() {
        assert_eq!(redis_quote("foo"), "\"foo\"");
    }

    #[test]
    fn preserves_internal_whitespace_so_argv_stays_one_token() {
        assert_eq!(redis_quote("user profile:42"), "\"user profile:42\"");
    }

    #[test]
    fn escapes_embedded_double_quotes() {
        assert_eq!(redis_quote(r#"say "hi""#), r#""say \"hi\"""#);
    }

    #[test]
    fn escapes_backslashes_first_so_round_trip_is_lossless() {
        // Back-slash before quote: caller meant a literal backslash and a
        // literal quote. Both must escape, in that order, or the quote
        // ends up looking pre-escaped to the tokenizer.
        assert_eq!(redis_quote(r#"a\b"c"#), r#""a\\b\"c""#);
    }
}
