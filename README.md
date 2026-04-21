# R-Splunk: Privacy-First Desktop Log Analyzer

A high-performance, privacy-first, local-first desktop log analyzer built with Rust, Tauri, and Next.js. Optimized for security, memory efficiency, and developer productivity.

## Features

✅ **Privacy-First**: All data processing happens locally. No cloud dependencies.  
✅ **High Performance**: Rust backend with Tantivy search engine for sub-second search on millions of logs.  
✅ **Memory Efficient**: Streams logs via `BufReader` and manages indices in batches. Optimized for 8GB RAM.  
✅ **Security Hardened**: 
  - Path traversal protection with canonicalized allowlists.
  - TCP/TLS log server binds to `127.0.0.1` only.
  - Rate-limited connections and log line truncation to prevent DoS.
  - Automated security audits (npm/cargo) in CI.
✅ **Supabase-Inspired Design**: Dark-mode-native theme with emerald green accents and dense typography.
✅ **Real-Time Streaming**: Batch-emitted log updates to the UI during ingestion.
✅ **Smart Parsing**: Automatically parses JSON, Apache, Nginx, Syslog, and generic log formats.
✅ **Advanced Query Console**: Field-specific filtering and complex query building with injection protection.
✅ **Visual Insights**: Real-time traffic intensity and severity distribution charts.

## Tech Stack

### Backend (Rust)
- **Framework**: Tauri v2.10
- **Async Runtime**: Tokio v1.52
- **Search Engine**: Tantivy v0.22 (full-text search)
- **Security**: `tokio-rustls`, `rustls-pki-types` (modern TLS), `rcgen` (self-signed certs)
- **Parsing**: `regex`, `serde`, `serde_json`
- **Normalization**: `chrono` (ISO 8601 formatting)

### Frontend (Next.js)
- **Framework**: Next.js 15 (App Router, Static Export)
- **Styling**: TailwindCSS (Supabase-inspired design tokens)
- **State Management**: Zustand with Immer middleware
- **Charts**: Recharts (mapped to severity levels)
- **Virtualization**: `@tanstack/react-virtual` for high-performance rendering

## Design System

R-Splunk follows a **Supabase-inspired dark theme**:

### Colors
- **Canvas**: `#171717` (Deep dark background)
- **Brand**: `#3ecf8e` (Supabase Green), `#00c573` (Interactive links)
- **Borders**: Layered hierarchy (`#242424` → `#2e2e2e` → `#363636`)
- **Text**: `#fafafa` (Off-white primary), `#898989` (Muted secondary)

### Typography
- **Headings**: `Circular` weight 400, **1.00 line-height** (dense hero statements)
- **Technical**: `Source Code Pro` uppercase, **1.2px letter-spacing** (developer console voice)

### Components
- **Buttons**: Pill-shaped (9999px) for primary actions, 6px ghost buttons for others.
- **Elevation**: Depth is created through border contrast rather than shadows.

## Getting Started

### Prerequisites
- Node.js 18+
- Rust (latest stable)
- Tauri CLI (`cargo install tauri-cli`)

### Installation & Development

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run tauri:dev
```

3. Build for production:
```bash
npm run tauri:build
```

## Security & Architecture

### Log Ingestion
- Files are validated to ensure they reside in allowed directories (`~`, `/tmp`, `/var/log`).
- Large files are processed in spawn_blocking tasks to keep the UI responsive.
- Paths are canonicalized before opening to prevent directory traversal.

### Network Server
- The application can receive logs over TCP/TLS.
- **Local Bind**: The server binds exclusively to `127.0.0.1`.
- **Encryption**: TLS 1.3 with self-signed certificates generated locally via `rcgen`.
- **Resilience**: Enforces a max connection limit and truncates lines over 64KB.

### Full-Text Search
- Powered by a local Tantivy index stored in the application's data directory.
- `QueryParser` handles search input with built-in protection against malformed queries.

## Performance Benchmarks
- **Ingestion**: ~100k lines per second on M1 hardware.
- **Search Latency**: <50ms for message-level queries on 1M entries.
- **Memory**: Resident set size (RSS) stays under 200MB during heavy indexing.

## License

MIT
