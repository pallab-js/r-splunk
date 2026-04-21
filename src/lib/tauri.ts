import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';

export interface LogEntry {
  timestamp: string | null;
  level: string | null;
  message: string;
  line_number: number;
  source_ip: string | null;
  status_code: string | null;
  request_path: string | null;
  source: string | null;
  source_file: string | null;
}

export async function ingestFile(path: string): Promise<number> {
  return invoke<number>('ingest_file', { path });
}

export async function searchIndex(query: string, limit?: number, offset?: number): Promise<LogEntry[]> {
  return invoke<LogEntry[]>('search_index_cmd', { query, limit, offset });
}

export async function onLogStream(callback: (entry: LogEntry) => void) {
  return listen<LogEntry>('log-stream', (event) => {
    callback(event.payload);
  });
}

export async function onLogStreamBatch(callback: (entries: LogEntry[]) => void) {
  return listen<LogEntry[]>('log-stream-batch', (event) => {
    callback(event.payload);
  });
}

export async function openFileDialog(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Log Files',
      extensions: ['log', 'txt', 'json', 'csv']
    }]
  });
  return Array.isArray(selected) ? selected[0] : selected;
}
