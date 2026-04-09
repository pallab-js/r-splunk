# R-Splunk: Privacy-First Desktop Log Analyzer

A high-performance, privacy-first, local-first desktop log analyzer built with Rust, Tauri, and Next.js.

## Features

✅ **Privacy-First**: All data processing happens locally. No cloud dependencies.  
✅ **Performance**: Rust backend for heavy lifting, efficient memory usage (streaming over loading).  
✅ **Full-Text Search**: Powered by Tantivy search engine for fast log searching.  
✅ **Real-Time Streaming**: Logs are streamed to the UI in real-time during ingestion.  
✅ **Smart Parsing**: Automatically parses JSON logs and extracts timestamps/levels from unstructured logs.  
✅ **Beautiful UI**: Minimalist, Ollama-inspired design with grayscale color palette.  
✅ **Visualizations**: Timeline and pie charts for log analysis (grayscale themed).  
✅ **Dashboard Layout**: Clean sidebar with file info, quick actions, and statistics.

## Tech Stack

### Backend (Rust)
- **Framework**: Tauri v2.0
- **Async Runtime**: Tokio
- **Search Engine**: Tantivy (full-text search)
- **Parsing**: Regex, Serde, Serde JSON
- **Database**: Rusqlite (for future metadata/config)
- **File System**: Notify (for future file watching)
- **Error Handling**: Anyhow, Thiserror

### Frontend (Next.js)
- **Framework**: Next.js 15 (App Router, Static Export)
- **Language**: TypeScript
- **Styling**: TailwindCSS (custom grayscale design system)
- **State Management**: Zustand
- **Charts**: Recharts (grayscale themed)
- **Icons**: Lucide React

## Design System

### Colors (Grayscale Palette)
- `bg-black`: #000000 (Headlines, primary links)
- `text-near-black`: #262626 (Button text, secondary headlines)
- `bg-darkest-surface`: #090909 (Footer/Containers)
- `bg-white`: #ffffff (Page background, secondary buttons)
- `bg-snow`: #fafafa (Subtle section backgrounds)
- `bg-light-gray`: #e5e5e5 (Primary buttons, borders)
- `text-stone`: #737373 (Secondary text, footer links)
- `text-mid-gray`: #525252 (Emphasized secondary text)
- `text-silver`: #a3a3a3 (Tertiary text, placeholders)
- `border-light`: #d4d4d4 (Button borders)

### Typography
- **Display/Headings**: 'SF Pro Rounded', system-ui, -apple-system (Weight 500)
- **Body/UI**: ui-sans-serif, system-ui (Weight 400/500)
- **Code/Mono**: ui-monospace, SFMono-Regular, Menlo (Weight 400)

### Border Radius
- **Interactive Elements**: 9999px (Pill shape)
- **Containers**: 12px

### Visual Rules
- ❌ No shadows
- ❌ No gradients
- ✅ Flat color blocks only
- ✅ Generous vertical whitespace (88px - 112px)

## Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd r-splunk
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri dev
```

4. Build for production:
```bash
npm run tauri build
```

## Usage

1. **Open a Log File**: Click the "Open File" button in the sidebar to select a log file from your system
2. **View Logs**: Logs are streamed in real-time to the virtualized table
3. **Search**: Use the search bar or Advanced Query Builder to perform full-text searches
4. **Visualize**: Toggle charts to see log distribution over time and by severity level
5. **Network Sources**: Configure TCP/TLS endpoints to receive logs from remote senders
6. **Export**: Click "Export JSON" to download your current log view

## Architecture

### IPC Communication
- **Frontend → Backend**: Tauri `invoke` commands
- **Backend → Frontend**: Tauri `emit` events (for real-time log streaming)

### Memory Management
- Files are read line-by-line using `BufReader` (not loaded entirely into memory)
- Tantivy index is committed every 1000 lines to manage memory
- Optimized for 8GB RAM (M1 MacBook Air)

### Log Parsing

Automatically detects and parses multiple log formats:

1. **JSON Logs**: Extracts `timestamp`, `level`, `message` (supports alternative keys like `time`, `severity`, `@timestamp`)
2. **Apache/Nginx**: Combined Log Format — extracts IP, method, path, status code; infers level from HTTP status
3. **Syslog**: Standard syslog with host, app, PID extraction
4. **Generic**: `TIMESTAMP LEVEL: MESSAGE` format (ISO 8601 timestamps)
5. **Fallback**: Raw messages with level/timestamp extraction via regex

## Development Roadmap

### ✅ Phase 1: Foundation & Environment (COMPLETE)
- Initialize Tauri app with Next.js frontend
- Configure Tailwind with design system
- Setup Rust dependencies
- Verify build

### ✅ Phase 2: The MVP (COMPLETE)
- File ingestion with streaming
- JSON and regex-based log parsing
- Tantivy search index
- Search functionality
- Frontend UI with search and results table

### ✅ Phase 3: UI/UX Polish & Dashboard (COMPLETE)
- Custom pill-shaped UI components
- Dashboard layout with sidebar
- Timeline chart (log count over time)
- Pie chart (log level distribution)
- Zustand state management

### ✅ Phase 4: Advanced Features (COMPLETE)
- TCP/TLS network log server (localhost-only)
- Advanced query builder with field/level/timestamp rules
- Log filtering by date range and level
- Export search results to JSON
- Self-signed TLS certificate generation via rcgen
- Query injection protection and input sanitization

## Performance

- **Memory**: Streams logs instead of loading entire files (~50MB for 1M line files)
- **Search**: Sub-second search on millions of logs via Tantivy
- **Index Size**: ~30% of original log file size

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

### Development Guidelines
- All data processing happens locally — no cloud dependencies
- Use `npm run tauri dev` for development
- Run `cargo test` in `src-tauri/` and `npm test` before submitting PRs
- Follow the grayscale design system (no shadows, no gradients, pill-shaped elements)
