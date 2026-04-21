import { useCallback } from 'react';
import { ingestFile, searchIndex, openFileDialog } from '@/lib/tauri';
import { useAppStore } from '@/store';

export function useLogActions() {
  const {
    logs,
    setLogs,
    clearLogs,
    restoreOriginalLogs,
    setSelectedFile,
    setIsLoading,
    setError,
    searchQuery,
  } = useAppStore();

  const handleSelectFile = useCallback(async () => {
    try {
      const path = await openFileDialog();
      if (path) {
        setSelectedFile(path);
        setIsLoading(true);
        setError(null);
        clearLogs();

        await ingestFile(path);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest file');
      setIsLoading(false);
    }
  }, [setSelectedFile, setIsLoading, setError, clearLogs]);

  const handleExport = useCallback(() => {
    if (logs.length === 0) return;
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', `r-splunk-export-${new Date().toISOString().slice(0, 10)}.json`);
      linkElement.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export logs');
    }
  }, [logs, setError]);

  const handleExportCsv = useCallback(() => {
    if (logs.length === 0) return;
    try {
      const headers = ['Timestamp', 'Level', 'Message', 'Source IP', 'Status Code', 'Request Path', 'Source File'];
      const rows = logs.map(log => [
        log.timestamp || '',
        log.level || '',
        `"${(log.message || '').replace(/"/g, '""')}"`,
        log.source_ip || '',
        log.status_code || '',
        log.request_path || '',
        log.source_file || ''
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', `r-splunk-export-${new Date().toISOString().slice(0, 10)}.csv`);
      linkElement.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export CSV');
    }
  }, [logs, setError]);

  const executeSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      restoreOriginalLogs();
      return;
    }
    try {
      setIsLoading(true);
      const results = await searchIndex(query);
      setLogs(results);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setLogs, restoreOriginalLogs]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery);
  }, [searchQuery, executeSearch]);

  return {
    handleSelectFile,
    handleExport,
    handleExportCsv,
    executeSearch,
    handleSearch,
  };
}
