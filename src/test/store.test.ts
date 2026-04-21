import { describe, it, expect } from 'vitest';
import { useAppStore } from '@/store';

describe('Zustand Store', () => {
  it('has initial state', () => {
    useAppStore.getState().clearLogs(); // Reset state first
    const state = useAppStore.getState();
    expect(state.logs).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.selectedFile).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedLevel).toBe('ALL');
  });

  it('clears all logs', () => {
    useAppStore.getState().clearLogs();
    const store = useAppStore.getState();
    expect(store.logs).toEqual([]);
  });

  it('adds a log entry', () => {
    useAppStore.getState().clearLogs();
    const { addLog } = useAppStore.getState();
    
    addLog({
      timestamp: '2024-01-15T10:30:00Z',
      level: 'ERROR',
      message: 'Test error',
      line_number: 1,
      source_ip: null,
      status_code: null,
      request_path: null,
      source: 'test',
    });
    
    const newState = useAppStore.getState();
    expect(newState.logs.length).toBe(1);
    expect(newState.logs[0].message).toBe('Test error');
  });

  it('sets search query', () => {
    const { setSearchQuery } = useAppStore.getState();
    setSearchQuery('ERROR');
    expect(useAppStore.getState().searchQuery).toBe('ERROR');
  });

  it('sets selected level filter', () => {
    const { setSelectedLevel } = useAppStore.getState();
    setSelectedLevel('ERROR');
    expect(useAppStore.getState().selectedLevel).toBe('ERROR');
  });

  it('sets time range', () => {
    const { setTimeRange } = useAppStore.getState();
    setTimeRange('2024-01-15', '2024-01-16');
    const state = useAppStore.getState();
    expect(state.timeRangeStart).toBe('2024-01-15');
    expect(state.timeRangeEnd).toBe('2024-01-16');
  });

  it('sets loading state', () => {
    const { setIsLoading } = useAppStore.getState();
    setIsLoading(true);
    expect(useAppStore.getState().isLoading).toBe(true);
    setIsLoading(false);
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('sets error state', () => {
    const { setError } = useAppStore.getState();
    setError('Test error');
    expect(useAppStore.getState().error).toBe('Test error');
    setError(null);
    expect(useAppStore.getState().error).toBeNull();
  });
});
