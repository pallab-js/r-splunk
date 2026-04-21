import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { LogEntry } from '@/lib/tauri';

export type LogLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

interface AppState {
  // Logs
  logs: LogEntry[];
  originalLogs: LogEntry[]; // Preserved original logs for restoring after search
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  addLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  restoreOriginalLogs: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // File
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;

  // Filters
  selectedLevel: LogLevel;
  setSelectedLevel: (level: LogLevel) => void;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  setTimeRange: (start: string | null, end: string | null) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Logs
    logs: [],
    originalLogs: [],
    setLogs: (logs) => set({ logs }),
    addLog: (log) =>
      set((state) => {
        state.logs.push(log);
        state.originalLogs.push(log);
      }),
    addLogs: (logs) =>
      set((state) => {
        state.logs.push(...logs);
        state.originalLogs.push(...logs);
      }),
    clearLogs: () => set({ logs: [], originalLogs: [] }),
    restoreOriginalLogs: () =>
      set((state) => {
        state.logs = [...state.originalLogs];
      }),

    // Search
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    // File
    selectedFile: null,
    setSelectedFile: (file) => set({ selectedFile: file }),

    // Filters
    selectedLevel: 'ALL',
    setSelectedLevel: (level) => set({ selectedLevel: level }),
    timeRangeStart: null,
    timeRangeEnd: null,
    setTimeRange: (start, end) => set({ timeRangeStart: start, timeRangeEnd: end }),

    // UI State
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    error: null,
    setError: (error) => set({ error }),
  }))
);
