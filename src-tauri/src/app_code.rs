use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::Mutex;
use lazy_static::lazy_static;
use chrono::Datelike;
use tantivy::{
    collector::TopDocs,
    doc,
    schema::{Schema, FAST, STORED, TEXT, Value, Field},
    Index, IndexWriter, TantivyDocument,
};

use tauri::{Emitter, Manager, State};

lazy_static! {
    static ref APACHE_PATTERN: regex::Regex = regex::Regex::new(
        r#"^(?P<ip>\d+\.\d+\.\d+\.\d+)\s+\S+\s+\S+\s+\[(?P<timestamp>[^\]]+)\]\s+"(?P<method>\w+)\s+(?P<path>\S+)\s+\S+"\s+(?P<status>\d+)\s+(?P<size>\d+)"#
    ).unwrap();
}

lazy_static! {
    static ref SYSLOG_PATTERN: regex::Regex = regex::Regex::new(
        r"^(?P<timestamp>\w+\s+\d+\s+\d+:\d+:\d+)\s+(?P<host>\S+)\s+(?P<app>\S+?)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.*)$"
    ).unwrap();
}

lazy_static! {
    static ref GENERIC_PATTERN: regex::Regex = regex::Regex::new(
        r"^(?P<timestamp>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(?P<level>DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|TRACE)\s*(?::\s*)?(?P<message>.*)$"
    ).unwrap();
}

lazy_static! {
    static ref LEVEL_PATTERN: regex::Regex = regex::Regex::new(r"(?i)\b(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|TRACE)\b").unwrap();
}

lazy_static! {
    static ref TIMESTAMP_PATTERN: regex::Regex = regex::Regex::new(
        r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?"
    ).unwrap();
}

lazy_static! {
    static ref APACHE_TIMESTAMP_PATTERN: regex::Regex = regex::Regex::new(
        r"(\d{2})/(\w{3})/(\d{4}):(\d{2}:\d{2}:\d{2})\s+([+-]\d{4})"
    ).unwrap();
}

/// Normalize various timestamp formats to ISO 8601 for consistent indexing
pub fn normalize_timestamp(ts: &str) -> Option<String> {
    // Already ISO 8601 / RFC 3339
    if TIMESTAMP_PATTERN.is_match(ts) {
        return Some(ts.to_string());
    }

    // Apache format: 15/Jan/2024:10:30:00 +0000
    if let Some(caps) = APACHE_TIMESTAMP_PATTERN.captures(ts) {
        let day = caps.get(1)?.as_str();
        let month_str = caps.get(2)?.as_str();
        let year = caps.get(3)?.as_str();
        let time = caps.get(4)?.as_str();
        let tz = caps.get(5)?.as_str();

        let month_num = match month_str {
            "Jan" => "01", "Feb" => "02", "Mar" => "03", "Apr" => "04",
            "May" => "05", "Jun" => "06", "Jul" => "07", "Aug" => "08",
            "Sep" => "09", "Oct" => "10", "Nov" => "11", "Dec" => "12",
            _ => return None,
        };

        // Format tz: +0000 -> +00:00
        let tz_formatted = if tz.len() == 5 {
            format!("{}:{}", &tz[0..3], &tz[3..5])
        } else {
            tz.to_string()
        };

        return Some(format!("{}-{}-{}T{}{}", year, month_num, day, time, tz_formatted));
    }

    // Syslog format: Jan 15 10:30:01 (no year, assume current year)
    let syslog_re = regex::Regex::new(r"^(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})$").ok()?;
    if let Some(caps) = syslog_re.captures(ts) {
        let month_str = caps.get(1)?.as_str();
        let day = caps.get(2)?.as_str().parse::<u32>().ok()?;
        let time = caps.get(3)?.as_str();

        let month_num = match month_str {
            "Jan" => "01", "Feb" => "02", "Mar" => "03", "Apr" => "04",
            "May" => "05", "Jun" => "06", "Jul" => "07", "Aug" => "08",
            "Sep" => "09", "Oct" => "10", "Nov" => "11", "Dec" => "12",
            _ => return None,
        };

        let now = chrono::Utc::now();
        let year = now.year();

        return Some(format!("{:04}-{}-{:02}T{}Z", year, month_num, day, time));
    }

    None
}

// Log entry structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: Option<String>,
    pub level: Option<String>,
    pub message: String,
    pub line_number: usize,
    pub source_ip: Option<String>,
    pub status_code: Option<String>,
    pub request_path: Option<String>,
    pub source: Option<String>,
    pub source_file: Option<String>,
}

// Schema fields
#[derive(Clone)]
pub struct SchemaFields {
    pub message: Field,
    pub level: Field,
    pub timestamp: Field,
    pub line_number: Field,
    pub source_file: Field,
    pub source_ip: Field,
    pub status_code: Field,
    pub request_path: Field,
    pub source_format: Field,
}

// Application state
pub struct AppState {
    pub index: Mutex<Option<Index>>,
    pub schema: Mutex<Option<Schema>>,
    pub fields: Mutex<Option<SchemaFields>>,
}

// Parse a single log line with pattern matching
pub fn parse_log_line(line: &str, _line_number: usize) -> LogEntry {
    // Try JSON first
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
        return parse_json_log(&json, line, _line_number);
    }

    // Try Apache/Nginx Combined Log Format
    if let Some(captures) = APACHE_PATTERN.captures(line) {
        let timestamp = captures.name("timestamp").map(|m| m.as_str().to_string());
        let status = captures.name("status").map(|m| m.as_str().to_string());
        let ip = captures.name("ip").map(|m| m.as_str().to_string());
        let path = captures.name("path").map(|m| m.as_str().to_string());
        let method = captures.name("method").map(|m| m.as_str().to_string());
        
        let message = format!(
            "{} {} - Status: {}",
            method.as_deref().unwrap_or(""),
            path.as_deref().unwrap_or(""),
            status.as_deref().unwrap_or("")
        );

        // Determine level based on status code
        let level = status.as_ref().map(|s| {
            match s.as_str() {
                s if s.starts_with('5') => "ERROR",
                s if s.starts_with('4') => "WARN",
                _ => "INFO",
            }
        }).map(|s| s.to_string());

        return LogEntry {
            timestamp,
            level,
            message,
            line_number: _line_number,
            source_ip: ip,
            status_code: status,
            request_path: path,
            source: Some("apache".to_string()),
            source_file: None,
        };
    }

    // Try Syslog format
    if let Some(captures) = SYSLOG_PATTERN.captures(line) {
        let timestamp = captures.name("timestamp").map(|m| m.as_str().to_string());
        let host = captures.name("host").map(|m| m.as_str().to_string());
        let app = captures.name("app").map(|m| m.as_str().to_string());
        let message = captures.name("message").map(|m| m.as_str().to_string()).unwrap_or_default();

        // Extract level from message
        let level = LEVEL_PATTERN
            .captures(&message)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_uppercase());

        let source = match (&host, &app) {
            (Some(h), Some(a)) => Some(format!("{}::{}", h, a)),
            (Some(h), None) => Some(h.clone()),
            (None, Some(a)) => Some(a.clone()),
            _ => None,
        };

        return LogEntry {
            timestamp,
            level,
            message,
            line_number: _line_number,
            source_ip: None,
            status_code: None,
            request_path: None,
            source,
            source_file: None,
        };
    }

    // Try generic timestamp + level + message format
    if let Some(captures) = GENERIC_PATTERN.captures(line) {
        let timestamp = captures.name("timestamp").map(|m| m.as_str().to_string());
        let level = captures.name("level").map(|m| m.as_str().to_uppercase());
        let message = captures.name("message").map(|m| m.as_str().to_string()).unwrap_or(line.to_string());

        return LogEntry {
            timestamp,
            level,
            message,
            line_number: _line_number,
            source_ip: None,
            status_code: None,
            request_path: None,
            source: Some("generic".to_string()),
            source_file: None,
        };
    }

    // Fallback: treat as raw message
    let level = LEVEL_PATTERN
        .captures(line)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str().to_uppercase());

    let timestamp = TIMESTAMP_PATTERN
        .find(line)
        .map(|m| m.as_str().to_string());

    LogEntry {
        timestamp,
        level,
        message: line.to_string(),
        line_number: _line_number,
        source_ip: None,
        status_code: None,
        request_path: None,
        source: None,
        source_file: None,
    }
}

// Parse JSON log
fn parse_json_log(json: &serde_json::Value, raw_line: &str, line_number: usize) -> LogEntry {
    let timestamp = json
        .get("timestamp")
        .or_else(|| json.get("time"))
        .or_else(|| json.get("@timestamp"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let level = json
        .get("level")
        .or_else(|| json.get("severity"))
        .or_else(|| json.get("log_level"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let message = json
        .get("message")
        .or_else(|| json.get("msg"))
        .and_then(|v| v.as_str())
        .unwrap_or(raw_line)
        .to_string();

    LogEntry {
        timestamp,
        level,
        message,
        line_number,
        source_ip: None,
        status_code: None,
        request_path: None,
        source: Some("json".to_string()),
        source_file: None,
    }
}

// Initialize the search index
fn init_index(app_handle: &tauri::AppHandle) -> Result<(Index, Schema, SchemaFields), String> {
    let mut schema_builder = Schema::builder();
    let message_field = schema_builder.add_text_field("message", TEXT | STORED);
    let level_field = schema_builder.add_text_field("level", TEXT | STORED | FAST);
    let timestamp_field = schema_builder.add_date_field("timestamp", FAST | STORED);
    let line_number_field = schema_builder.add_u64_field("line_number", FAST | STORED);
    let source_file_field = schema_builder.add_text_field("source_file", TEXT | STORED);
    let source_ip_field = schema_builder.add_text_field("source_ip", STORED);
    let status_code_field = schema_builder.add_text_field("status_code", STORED);
    let request_path_field = schema_builder.add_text_field("request_path", STORED);
    let source_format_field = schema_builder.add_text_field("source_format", STORED);
    let schema = schema_builder.build();

    let fields = SchemaFields {
        message: message_field,
        level: level_field,
        timestamp: timestamp_field,
        line_number: line_number_field,
        source_file: source_file_field,
        source_ip: source_ip_field,
        status_code: status_code_field,
        request_path: request_path_field,
        source_format: source_format_field,
    };

    let index_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("index_data");

    std::fs::create_dir_all(&index_dir)
        .map_err(|e| format!("Failed to create index dir: {}", e))?;

    let index = Index::create_in_dir(&index_dir, schema.clone())
        .map_err(|e| format!("Failed to create index: {}", e))?;

    Ok((index, schema, fields))
}

// Tauri command to ingest a file
#[tauri::command]
pub async fn ingest_file(
    path: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let path = Path::new(&path);

    // Security: Validate path to prevent directory traversal
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;

    // Only allow files within user-accessible directories (not system dirs)
    let blocked_prefixes = ["/etc/", "/usr/bin/", "/usr/sbin/", "/sys/", "/proc/"];
    let path_str = canonical_path.to_string_lossy();
    for prefix in &blocked_prefixes {
        if path_str.starts_with(prefix) {
            return Err(format!("Access denied: cannot read from restricted path"));
        }
    }

    if !canonical_path.exists() {
        return Err(format!("File not found: {}", canonical_path.display()));
    }

    // Verify it's a file, not a directory or symlink to sensitive resource
    if !canonical_path.is_file() {
        return Err("Path is not a regular file".to_string());
    }

    let file = File::open(&canonical_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let reader = BufReader::new(file);

    // Store file path for indexing
    let source_file_path = canonical_path.to_string_lossy().to_string();

    // Initialize or reset index for new file ingestion
    let mut index_guard = state.index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut schema_guard = state.schema.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut fields_guard = state.fields.lock().map_err(|e| format!("Lock poisoned: {}", e))?;

    // Reset index for each new file to avoid cross-file contamination
    if index_guard.is_some() {
        // Drop the index directory contents and recreate
        let index_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?
            .join("index_data");
        let _ = std::fs::remove_dir_all(&index_dir);
        let _ = std::fs::create_dir_all(&index_dir);
    }

    if index_guard.is_none() {
        let (index, schema, fields) = init_index(&app_handle)?;
        *index_guard = Some(index);
        *schema_guard = Some(schema);
        *fields_guard = Some(fields);
    } else {
        // Reinitialize the index for the new file
        let (index, schema, fields) = init_index(&app_handle)?;
        *index_guard = Some(index);
        *schema_guard = Some(schema);
        *fields_guard = Some(fields);
    }

    let index = index_guard.as_ref().unwrap();
    let fields = fields_guard.as_ref().unwrap();

    let mut index_writer: IndexWriter = index
        .writer(50_000_000)
        .map_err(|e| format!("Failed to create index writer: {}", e))?;

    let message_field = fields.message;
    let level_field = fields.level;
    let timestamp_field = fields.timestamp;
    let line_number_field = fields.line_number;
    let source_file_field = fields.source_file;
    let source_ip_field = fields.source_ip;
    let status_code_field = fields.status_code;
    let request_path_field = fields.request_path;
    let source_format_field = fields.source_format;

    let mut line_count = 0;
    let mut emitted_count = 0;
    const EMIT_BATCH_SIZE: usize = 100; // Security: batch emissions to prevent memory flood

    // Stream lines to frontend
    for (i, line_result) in reader.lines().enumerate() {
        let line = line_result.map_err(|e| format!("Failed to read line: {}", e))?;
        line_count = i + 1;

        let mut log_entry = parse_log_line(&line, line_count);
        log_entry.source_file = Some(source_file_path.clone());

        // Security: Batch emit events to prevent memory flood on large files
        emitted_count += 1;
        if emitted_count % EMIT_BATCH_SIZE == 0 || line_count % 1000 == 0 {
            app_handle
                .emit("log-stream", &log_entry)
                .map_err(|e| format!("Failed to emit event: {}", e))?;
        }

        // Add to index with all fields
        let mut doc = TantivyDocument::default();
        doc.add_text(message_field, &log_entry.message);

        if let Some(ref level) = log_entry.level {
            doc.add_text(level_field, level);
        }

        if let Some(ref timestamp_str) = log_entry.timestamp {
            // Try RFC3339 first, then normalize from other formats
            let indexed_ts = if let Ok(timestamp) = tantivy::time::OffsetDateTime::parse(
                timestamp_str,
                &tantivy::time::format_description::well_known::Rfc3339,
            ) {
                Some(tantivy::DateTime::from_timestamp_secs(timestamp.unix_timestamp()))
            } else {
                // Try normalizing from Apache/Syslog formats to ISO 8601
                normalize_timestamp(timestamp_str)
                    .and_then(|normalized| {
                        tantivy::time::OffsetDateTime::parse(
                            &normalized,
                            &tantivy::time::format_description::well_known::Rfc3339,
                        ).ok()
                    })
                    .map(|dt| tantivy::DateTime::from_timestamp_secs(dt.unix_timestamp()))
            };

            if let Some(dt) = indexed_ts {
                doc.add_date(timestamp_field, dt);
            }
        }

        doc.add_u64(line_number_field, line_count as u64);
        doc.add_text(source_file_field, &source_file_path);

        if let Some(ref ip) = log_entry.source_ip {
            doc.add_text(source_ip_field, ip);
        }
        if let Some(ref code) = log_entry.status_code {
            doc.add_text(status_code_field, code);
        }
        if let Some(ref path) = log_entry.request_path {
            doc.add_text(request_path_field, path);
        }
        if let Some(ref fmt) = log_entry.source {
            doc.add_text(source_format_field, fmt);
        }

        index_writer
            .add_document(doc)
            .map_err(|e| format!("Failed to add document: {}", e))?;

        // Commit every 1000 lines to manage memory
        if line_count % 1000 == 0 {
            index_writer
                .commit()
                .map_err(|e| format!("Failed to commit: {}", e))?;
        }
    }

    // Final commit
    index_writer
        .commit()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    Ok(line_count)
}

// Tauri command to search the index
#[tauri::command]
pub async fn search_index_cmd(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<LogEntry>, String> {
    let index_guard = state.index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let fields_guard = state.fields.lock().map_err(|e| format!("Lock poisoned: {}", e))?;

    let index = index_guard.as_ref().ok_or("Index not initialized")?;
    let fields = fields_guard.as_ref().ok_or("Fields not initialized")?;

    let reader = index
        .reader()
        .map_err(|e| format!("Failed to create reader: {}", e))?;
    let searcher = reader.searcher();

    let query_parser = tantivy::query::QueryParser::for_index(
        index,
        vec![fields.message, fields.level],
    );

    let query = query_parser
        .parse_query(&query)
        .map_err(|e| format!("Failed to parse query: {}", e))?;

    let top_docs = searcher
        .search(&query, &TopDocs::with_limit(100))
        .map_err(|e| format!("Failed to search: {}", e))?;

    let mut results = Vec::new();
    for (_score, doc_address) in top_docs {
        let doc = searcher
            .doc::<TantivyDocument>(doc_address)
            .map_err(|e| format!("Failed to get doc: {}", e))?;

        let message = doc
            .get_first(fields.message)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let level = doc
            .get_first(fields.level)
            .and_then(|v| v.as_str())
            .map(|s: &str| s.to_string());

        let timestamp = doc
            .get_first(fields.timestamp)
            .and_then(|v| v.as_datetime())
            .map(|dt| {
                let seconds = dt.into_timestamp_secs();
                chrono::DateTime::from_timestamp(seconds, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default()
            });

        let line_number = doc
            .get_first(fields.line_number)
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        let source_file = doc
            .get_first(fields.source_file)
            .and_then(|v| v.as_str())
            .map(|s: &str| s.to_string());

        let source_ip = doc
            .get_first(fields.source_ip)
            .and_then(|v| v.as_str())
            .map(|s: &str| s.to_string());

        let status_code = doc
            .get_first(fields.status_code)
            .and_then(|v| v.as_str())
            .map(|s: &str| s.to_string());

        let request_path = doc
            .get_first(fields.request_path)
            .and_then(|v| v.as_str())
            .map(|s: &str| s.to_string());

        let source = doc
            .get_first(fields.source_format)
            .and_then(|v| v.as_str())
            .map(|s: &str| s.to_string());

        results.push(LogEntry {
            timestamp,
            level,
            message,
            line_number,
            source_ip,
            status_code,
            request_path,
            source,
            source_file,
        });
    }

    Ok(results)
}

/// Tauri command to clear the search index
#[tauri::command]
pub fn clear_index(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut index_guard = state.index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *index_guard = None;

    // Clear the on-disk index
    let index_dir = std::env::temp_dir().join("r-splunk-index");
    if index_dir.exists() {
        std::fs::remove_dir_all(&index_dir)
            .map_err(|e| format!("Failed to clear index: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // JSON Log Parsing Tests
    #[test]
    fn test_parse_json_log_standard_format() {
        let line = r#"{"timestamp": "2024-01-15T10:30:00Z", "level": "ERROR", "message": "Connection timeout"}"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00Z".to_string()));
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert_eq!(log.message, "Connection timeout");
        assert_eq!(log.source, Some("json".to_string()));
    }

    #[test]
    fn test_parse_json_log_alternative_timestamp() {
        let line = r#"{"time": "2024-01-15T10:30:00Z", "severity": "WARN", "msg": "High memory usage"}"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00Z".to_string()));
        assert_eq!(log.level, Some("WARN".to_string()));
        assert_eq!(log.message, "High memory usage");
    }

    #[test]
    fn test_parse_json_log_kubernetes_format() {
        let line = r#"{"@timestamp": "2024-01-15T10:30:00Z", "log_level": "INFO", "message": "Request processed"}"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00Z".to_string()));
        assert_eq!(log.level, Some("INFO".to_string()));
        assert_eq!(log.source, Some("json".to_string()));
    }

    // Apache/Nginx Log Parsing Tests
    #[test]
    fn test_parse_apache_log_success() {
        let line = r#"192.168.1.100 - - [15/Jan/2024:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.source_ip, Some("192.168.1.100".to_string()));
        assert_eq!(log.request_path, Some("/api/users".to_string()));
        assert_eq!(log.status_code, Some("200".to_string()));
        assert_eq!(log.level, Some("INFO".to_string()));
        assert_eq!(log.source, Some("apache".to_string()));
        assert!(log.message.contains("GET"));
        assert!(log.message.contains("/api/users"));
    }

    #[test]
    fn test_parse_apache_log_server_error() {
        let line = r#"10.0.0.1 - - [15/Jan/2024:10:30:00 +0000] "POST /api/submit HTTP/1.1" 500 512"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.status_code, Some("500".to_string()));
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert_eq!(log.source_ip, Some("10.0.0.1".to_string()));
    }

    #[test]
    fn test_parse_apache_log_client_error() {
        let line = r#"172.16.0.5 - - [15/Jan/2024:10:30:00 +0000] "GET /missing-page HTTP/1.1" 404 256"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.status_code, Some("404".to_string()));
        assert_eq!(log.level, Some("WARN".to_string()));
        assert_eq!(log.request_path, Some("/missing-page".to_string()));
    }

    // Syslog Parsing Tests
    #[test]
    fn test_parse_syslog_with_pid() {
        let line = "Jan 15 10:30:01 myhost myapp[1234]: ERROR: Database connection failed";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert_eq!(log.message, "ERROR: Database connection failed");
        assert_eq!(log.source, Some("myhost::myapp".to_string()));
    }

    #[test]
    fn test_parse_syslog_without_pid() {
        let line = "Jan 15 10:30:01 webserver nginx: WARNING: Rate limit exceeded";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.level, Some("WARNING".to_string()));
        assert_eq!(log.message, "WARNING: Rate limit exceeded");
        assert_eq!(log.source, Some("webserver::nginx".to_string()));
    }

    #[test]
    fn test_parse_syslog_info_level() {
        let line = "Jan 15 10:30:01 localhost cron[5678]: INFO: Job completed successfully";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.level, Some("INFO".to_string()));
        assert_eq!(log.source, Some("localhost::cron".to_string()));
    }

    // Generic Log Format Tests
    #[test]
    fn test_parse_generic_iso_timestamp() {
        let line = "2024-01-15T10:30:00Z ERROR: Application crashed unexpectedly";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00Z".to_string()));
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert_eq!(log.message, "Application crashed unexpectedly");
        assert_eq!(log.source, Some("generic".to_string()));
    }

    #[test]
    fn test_parse_generic_with_timezone() {
        let line = "2024-01-15T10:30:00+05:30 WARN: Memory usage high";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00+05:30".to_string()));
        assert_eq!(log.level, Some("WARN".to_string()));
        assert!(log.message.contains("Memory usage high"));
    }

    #[test]
    fn test_parse_generic_all_levels() {
        let test_cases = vec![
            ("2024-01-15T10:30:00Z DEBUG: Verbose output", "DEBUG"),
            ("2024-01-15T10:30:00Z INFO: Normal operation", "INFO"),
            ("2024-01-15T10:30:00Z WARNING: Something odd", "WARNING"),
            ("2024-01-15T10:30:00Z ERROR: Failure occurred", "ERROR"),
            ("2024-01-15T10:30:00Z FATAL: System shutting down", "FATAL"),
            ("2024-01-15T10:30:00Z TRACE: Entering function", "TRACE"),
        ];

        for (line, expected_level) in test_cases {
            let log = parse_log_line(line, 1);
            assert_eq!(log.level, Some(expected_level.to_string()), "Failed for line: {}", line);
        }
    }

    // Fallback Parsing Tests
    #[test]
    fn test_parse_fallback_raw_message() {
        let line = "This is an unstructured log message with no recognizable format";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.message, "This is an unstructured log message with no recognizable format");
        assert_eq!(log.level, None);
        assert_eq!(log.timestamp, None);
        assert_eq!(log.source, None);
    }

    #[test]
    fn test_parse_fallback_extract_level_only() {
        let line = "Something went wrong - ERROR in the system";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert_eq!(log.message, line.to_string());
    }

    #[test]
    fn test_parse_fallback_extract_timestamp_only() {
        let line = "Some event happened at 2024-01-15T10:30:00Z in the system";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00Z".to_string()));
    }

    // Edge Cases
    #[test]
    fn test_parse_empty_line() {
        let line = "";
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.message, "");
        assert_eq!(log.line_number, 1);
    }

    #[test]
    fn test_parse_line_number_tracking() {
        let line = "2024-01-15T10:30:00Z INFO: Test message";
        let log = parse_log_line(line, 42);
        
        assert_eq!(log.line_number, 42);
    }

    #[test]
    fn test_parse_multiline_message_preserved() {
        let line = r#"2024-01-15T10:30:00Z ERROR: Stack trace:\n  at module.function()\n  at main()"#;
        let log = parse_log_line(line, 1);
        
        assert!(log.message.contains("Stack trace"));
        assert_eq!(log.level, Some("ERROR".to_string()));
    }

    // Pattern Priority Tests
    #[test]
    fn test_json_takes_priority_over_generic() {
        // Even if JSON contains a generic-looking timestamp, JSON parser should win
        let line = r#"{"timestamp": "2024-01-15T10:30:00Z", "level": "INFO", "message": "test"}"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.source, Some("json".to_string()));
    }

    #[test]
    fn test_apache_takes_priority_over_generic() {
        // Apache logs have timestamps too but Apache pattern should match first
        let line = r#"192.168.1.1 - - [15/Jan/2024:10:30:00 +0000] "GET / HTTP/1.1" 200 100"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.source, Some("apache".to_string()));
        assert_eq!(log.source_ip, Some("192.168.1.1".to_string()));
    }

    // Query Building Tests
    #[test]
    fn test_query_single_field_search() {
        let line = r#"2024-01-15T10:30:00Z ERROR: Connection timeout"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert!(log.message.contains("Connection timeout"));
    }

    #[test]
    fn test_query_level_filtering() {
        let lines = vec![
            "2024-01-15T10:30:00Z ERROR: Error message",
            "2024-01-15T10:30:01Z INFO: Info message",
            "2024-01-15T10:30:02Z WARN: Warning message",
        ];
        
        let logs: Vec<LogEntry> = lines.iter().enumerate()
            .map(|(i, line)| parse_log_line(line, i + 1))
            .collect();
        
        let errors: Vec<&LogEntry> = logs.iter()
            .filter(|l| l.level.as_deref() == Some("ERROR"))
            .collect();
        
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].message, "Error message");
    }

    #[test]
    fn test_query_message_contains_keyword() {
        let lines = vec![
            "2024-01-15T10:30:00Z INFO: Database connection established",
            "2024-01-15T10:30:01Z ERROR: Database query failed",
            "2024-01-15T10:30:02Z INFO: Request processed",
        ];
        
        let logs: Vec<LogEntry> = lines.iter().enumerate()
            .map(|(i, line)| parse_log_line(line, i + 1))
            .collect();
        
        let db_logs: Vec<&LogEntry> = logs.iter()
            .filter(|l| l.message.contains("Database"))
            .collect();
        
        assert_eq!(db_logs.len(), 2);
    }

    // Index Schema Tests
    #[test]
    fn test_log_entry_serialization() {
        let log = LogEntry {
            timestamp: Some("2024-01-15T10:30:00Z".to_string()),
            level: Some("ERROR".to_string()),
            message: "Test message".to_string(),
            line_number: 42,
            source_ip: Some("192.168.1.1".to_string()),
            status_code: Some("500".to_string()),
            request_path: Some("/api/test".to_string()),
            source: Some("apache".to_string()),
            source_file: Some("/path/to/test.log".to_string()),
        };
        
        let json = serde_json::to_string(&log).unwrap();
        assert!(json.contains("2024-01-15T10:30:00Z"));
        assert!(json.contains("ERROR"));
        assert!(json.contains("Test message"));
    }

    #[test]
    fn test_log_entry_deserialization() {
        let json = r#"{"timestamp":"2024-01-15T10:30:00Z","level":"ERROR","message":"Test","line_number":1,"source_ip":null,"status_code":null,"request_path":null,"source":null}"#;
        let log: LogEntry = serde_json::from_str(json).unwrap();
        
        assert_eq!(log.timestamp, Some("2024-01-15T10:30:00Z".to_string()));
        assert_eq!(log.level, Some("ERROR".to_string()));
        assert_eq!(log.message, "Test");
    }

    // Real-world Log Samples Tests
    #[test]
    fn test_parse_docker_logs() {
        let line = r#"{"log":"2024-01-15 10:30:00.123 INFO  [main] com.example.App - Application started\n","stream":"stdout","time":"2024-01-15T10:30:00.123456789Z"}"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.source, Some("json".to_string()));
    }

    #[test]
    fn test_parse_application_json_logs() {
        let line = r#"{"@timestamp":"2024-01-15T10:30:00.000Z","log.level":"ERROR","message":"NullPointerException in UserService.getUser()","ecs.version":"1.6.0"}"#;
        let log = parse_log_line(line, 1);
        
        assert_eq!(log.source, Some("json".to_string()));
        assert!(log.message.contains("NullPointerException"));
    }

    #[test]
    fn test_parse_various_ip_formats() {
        let ips = vec![
            "192.168.1.1",
            "10.0.0.1",
            "172.16.0.100",
            "255.255.255.255",
        ];
        
        for ip in ips {
            let line = format!(r#"{} - - [15/Jan/2024:10:30:00 +0000] "GET / HTTP/1.1" 200 100"#, ip);
            let log = parse_log_line(&line, 1);
            assert_eq!(log.source_ip, Some(ip.to_string()));
        }
    }

    // Performance Characteristics Tests
    #[test]
    fn test_parse_many_lines_consistency() {
        let line = "2024-01-15T10:30:00Z INFO: Test message";
        
        for i in 1..=1000 {
            let log = parse_log_line(line, i);
            assert_eq!(log.level, Some("INFO".to_string()));
            assert_eq!(log.line_number, i);
        }
    }

    #[test]
    fn test_parse_mixed_log_types() {
        let lines = vec![
            r#"{"timestamp": "2024-01-15T10:30:00Z", "level": "INFO", "message": "JSON log"}"#,
            r#"192.168.1.1 - - [15/Jan/2024:10:30:00 +0000] "GET / HTTP/1.1" 200 100"#,
            "Jan 15 10:30:01 host app[123]: ERROR: Syslog message",
            "2024-01-15T10:30:00Z WARN: Generic log message",
            "Unstructured text with no format",
        ];
        
        let expected_sources: Vec<Option<&str>> = vec![Some("json"), Some("apache"), Some("host::app"), Some("generic"), None];
        
        for (i, (line, expected_source)) in lines.iter().zip(expected_sources.iter()).enumerate() {
            let log = parse_log_line(line, i + 1);
            match expected_source {
                Some(s) => assert_eq!(log.source.as_deref(), Some(*s), "Line {}", i),
                None => assert!(log.source.is_none(), "Line {}", i),
            }
        }
    }
}
