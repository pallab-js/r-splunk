# R-Splunk: Privacy-First Desktop Log Analyzer

## Project Overview

R-Splunk is a desktop log analyzer application built with Rust, Tauri, and Next.js. It provides a privacy-first, local-first approach to log analysis with full-text search, real-time streaming, and visualizations. The application is optimized for 8GB RAM systems (specifically M1 MacBook Air).

### Key Features
- **Privacy-First**: All data processing happens locally with no cloud dependencies
- **High Performance**: Rust backend with Tantivy search engine for fast indexing and searching
- **Smart Parsing**: Automatic parsing of JSON, Apache, Nginx, Syslog, and generic log formats
- **Beautiful UI**: Ollama-inspired grayscale design system with pill-shaped components
- **Network Connectivity**: TCP/TLS server for receiving logs from remote sources
- **Virtualization**: Efficient log display handling millions of rows via @tanstack/react-virtual

## Tech Stack

### Backend (Rust - `src-tauri/`)
- Tauri v2.0 for desktop framework
- Tokio for async runtime
- Tantivy v0.22 for full-text search indexing
- Regex, Serde, Serde JSON for parsing
- Rusqlite for metadata storage
- Notify for file watching
- Tokio-rustls for TLS connections
- UUID v4 for unique identifiers

### Frontend (Next.js - `src/`)
- Next.js 15 (App Router, Static Export)
- TypeScript
- TailwindCSS with custom grayscale design system
- Zustand for state management
- Recharts for visualizations
- Lucide React for icons
- @tanstack/react-virtual for log table virtualization

## Project Structure

```
r-splunk/
├── src/                          # Next.js Frontend
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Main dashboard
│   │   ├── globals.css           # Global styles
│   │   ├── error.tsx             # Route error boundary
│   │   └── global-error.tsx      # Global error boundary
│   ├── components/               # React components
│   │   ├── charts.tsx            # Recharts visualizations
│   │   ├── layout.tsx            # Dashboard layout
│   │   ├── network-sources.tsx   # Network source manager
│   │   ├── query-builder.tsx     # Advanced query builder
│   │   ├── ui.tsx                # Reusable UI components
│   │   └── virtual-log-table.tsx # Virtualized log table
│   ├── lib/                      # Utilities
│   │   └── tauri.ts              # Tauri IPC helpers
│   ├── store/                    # Zustand stores
│   │   └── index.ts              # App state
│   └── test/                     # Frontend tests
│       ├── tauri-helpers.test.ts
│       └── store.test.ts
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── app_code.rs           # Core logic (30 unit tests)
│   │   └── network.rs            # TCP/TLS server
│   ├── capabilities/
│   │   └── main.json             # Tauri permissions
│   ├── icons/                    # Application icons
│   ├── Cargo.toml                # Rust dependencies
│   ├── build.rs                  # Tauri build script
│   └── tauri.conf.json           # Tauri configuration
├── package.json                  # Node dependencies
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # TailwindCSS design system
├── vitest.config.ts              # Vitest test configuration
├── postcss.config.js             # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # User documentation
├── AGENTS.md                     # Development guide
├── blueprint.md                  # Architecture blueprint
└── roadmap.md                    # Development roadmap
```

## Building and Running

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Commands
```bash
# Install dependencies
npm install

# Run in development mode (Next.js dev + Tauri)
npm run tauri dev

# Build for production
npm run tauri build

# Frontend only
npm run dev              # Start Next.js dev server
npm run build            # Build Next.js static export
npm run start            # Start Next.js production server

# Testing
npm test                 # Run frontend tests (Vitest)
npm run test:watch       # Run tests in watch mode
cd src-tauri && cargo test  # Run Rust tests
```

### Development Workflow
1. Start Next.js dev server: `npm run dev`
2. In another terminal, run: `cd src-tauri && cargo run`
3. Or use the combined command: `npm run tauri dev`

## Architecture

### IPC Communication
- **Frontend → Backend**: Tauri `invoke` commands
  - `ingest_file(path)`: Ingest and index a log file
  - `search_index_cmd(query)`: Search indexed logs
  - `add_network_source()`: Add network log source
  - `start_network_server()`: Start TCP/TLS server
- **Backend → Frontend**: Tauri `emit` events
  - `log-stream`: Streams log entries during ingestion
  - `server-status`: Server connection status updates

### Tauri Commands (Rust)
- `ingest_file`: Reads file line-by-line using BufReader, parses each line, adds to Tantivy index, emits events to frontend
- `search_index_cmd`: Uses Tantivy QueryParser to search message and level fields, returns top 100 results
- `add_network_source`: Adds network source configuration
- `start_network_server`: Spawns TCP/TLS server in background tokio task
- `get_network_sources`: Returns list of configured network sources
- `remove_network_source`: Removes a network source

### Memory Management
- Files are read line-by-line (BufReader::lines()) - never loaded entirely into memory
- Tantivy index is committed every 1000 lines to manage memory
- Optimized for 8GB RAM systems
- Virtualized log table renders only visible rows (~15 DOM nodes regardless of total)

## Design System

### Colors (Grayscale)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-black` | #000000 | Headlines, primary links |
| `text-near-black` | #262626 | Button text, secondary headlines |
| `bg-darkest-surface` | #090909 | Footer/Containers |
| `bg-white` | #ffffff | Page background, secondary buttons |
| `bg-snow` | #fafafa | Subtle section backgrounds |
| `bg-light-gray` | #e5e5e5 | Primary buttons, borders |
| `text-stone` | #737373 | Secondary text, footer links |
| `text-mid-gray` | #525252 | Emphasized secondary text |
| `text-silver` | #a3a3a3 | Tertiary text, placeholders |
| `border-light` | #d4d4d4 | White-surface button borders |

### Typography
- **Display/Headings**: `'SF Pro Rounded', system-ui, -apple-system` (Weight 500)
- **Body/UI**: `ui-sans-serif, system-ui` (Weight 400/500)
- **Code/Mono**: `ui-monospace, SFMono-Regular, Menlo` (Weight 400)

### Border Radius
- **Interactive Elements**: `9999px` (Pill shape)
- **Containers**: `12px`

### Visual Rules
- ❌ No shadows
- ❌ No gradients
- ✅ Flat color blocks only
- ✅ Generous vertical whitespace (88px - 112px)

## Testing

### Rust Tests (30 tests)
Located in `src-tauri/src/app_code.rs` under `#[cfg(test)]` module.
- JSON log parsing (standard, alternative, Kubernetes)
- Apache/Nginx log parsing (200, 4xx, 5xx)
- Syslog parsing (with/without PID)
- Generic format (ISO timestamps, timezones, all levels)
- Fallback parsing (raw messages, level/timestamp extraction)
- Edge cases (empty lines, line numbers, multiline)
- Pattern priority (JSON over generic, Apache over generic)
- Serialization (JSON serialize/deserialize)
- Performance (1000 lines consistency, mixed types)

Run: `cd src-tauri && cargo test`

### Frontend Tests (12 tests)
Located in `src/test/`.
- Tauri IPC helpers (function existence, interface exports)
- Zustand store (initial state, add/clear logs, search query, level filter, time range, loading, error)

Run: `npm test` or `npm run test:watch`

## Log Parsing Patterns

The application supports multiple log formats:
1. **JSON**: Extracts `timestamp`, `level`, `message` from standard JSON logs
2. **Apache/Nginx**: Parses Combined Log Format (IP, method, path, status code, infers level from HTTP status)
3. **Syslog**: Parses standard syslog format (timestamp, host, app, PID, message)
4. **Generic**: Parses `TIMESTAMP LEVEL: MESSAGE` format
5. **Fallback**: Extracts level/timestamp via regex, treats rest as raw message

## Network Connectivity

The application can act as a TCP/TLS server to receive logs from remote sources:
- Self-signed certificate generation for TLS
- Configurable port and TLS toggle
- Connection status indicators
- Real-time log ingestion from network sources

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Foundation & Environment |
| Phase 2 | ✅ Complete | MVP (Ingest, Parse, Index, Search) |
| Phase 3 | ✅ Complete | UI/UX Polish & Dashboard |
| Phase 4 | ✅ Complete | Network Connectivity & TLS |

## Known Considerations

- TLS uses placeholder certificates; production should use proper certificate management
- File tailing/watching deferred due to Rust async lifetime complexity
- Grok parsing via native library not implemented; pattern-based parsing used instead
