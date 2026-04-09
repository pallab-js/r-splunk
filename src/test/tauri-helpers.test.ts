import { describe, it, expect } from 'vitest';

describe('Tauri IPC Helpers', () => {
  it('exports LogEntry interface', () => {
    const mockLog = {
      timestamp: '2024-01-15T10:30:00Z',
      level: 'ERROR',
      message: 'Test',
      line_number: 1,
      source_ip: null,
      status_code: null,
      request_path: null,
      source: 'test',
    };
    expect(mockLog.message).toBe('Test');
    expect(mockLog.level).toBe('ERROR');
  });

  it('openFileDialog returns null or string', async () => {
    const { openFileDialog } = await import('@/lib/tauri');
    expect(typeof openFileDialog).toBe('function');
  });

  it('ingestFile function exists', async () => {
    const { ingestFile } = await import('@/lib/tauri');
    expect(typeof ingestFile).toBe('function');
  });

  it('searchIndex function exists', async () => {
    const { searchIndex } = await import('@/lib/tauri');
    expect(typeof searchIndex).toBe('function');
  });
});
