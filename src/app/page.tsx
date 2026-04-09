'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ingestFile, searchIndex, openFileDialog, onLogStream, LogEntry } from '@/lib/tauri';
import { useAppStore, LogLevel } from '@/store';
import { DashboardLayout } from '@/components/layout';
import { LogCharts } from '@/components/charts';
import { VirtualLogTable } from '@/components/virtual-log-table';
import { QueryBuilder } from '@/components/query-builder';
import { NetworkSources } from '@/components/network-sources';
import { Button, Input, Card, Badge } from '@/components/ui';
import { Search, FileText, AlertCircle, Info, AlertTriangle, BarChart3, Download } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const {
    logs,
    setLogs,
    addLog,
    clearLogs,
    restoreOriginalLogs,
    searchQuery,
    setSearchQuery,
    selectedFile,
    setSelectedFile,
    isLoading,
    setIsLoading,
    error,
    setError,
    selectedLevel,
    setSelectedLevel,
    timeRangeStart,
    timeRangeEnd,
    setTimeRange,
  } = useAppStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for log stream events
  // Use a ref to avoid recreating listener on every render
  const addLogRef = useRef(useAppStore.getState().addLog);
  useEffect(() => {
    addLogRef.current = useAppStore.getState().addLog;
  }, []);

  useEffect(() => {
    const unlisten = onLogStream((entry) => {
      addLogRef.current(entry);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Handle file selection
  const handleSelectFile = useCallback(async () => {
    try {
      const path = await openFileDialog();
      if (path) {
        setSelectedFile(path);
        setIsLoading(true);
        setError(null);
        clearLogs();
        setShowCharts(false);

        const count = await ingestFile(path);
        setIsLoading(false);
        setShowCharts(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest file');
      setIsLoading(false);
    }
  }, [setSelectedFile, setIsLoading, setError, clearLogs]);

  // Handle export
  const handleExport = useCallback(() => {
    if (logs.length === 0) return;

    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const exportFileDefaultName = `r-splunk-export-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      // Cleanup the object URL
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export logs');
    }
  }, [logs, setError]);

  // Handle search
  const executeSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Restore original logs when query is cleared
      restoreOriginalLogs();
      // Read current logs count from store directly to avoid stale closure
      const currentLogs = useAppStore.getState().logs;
      setShowCharts(currentLogs.length > 0);
      return;
    }

    try {
      setIsLoading(true);
      const results = await searchIndex(query);
      setLogs(results);
      setIsLoading(false);
      setShowCharts(results.length > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setLogs, restoreOriginalLogs]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery);
  }, [searchQuery, executeSearch]);

  // Get log level icon
  const getLevelIcon = (level: string | null) => {
    if (!level) return null;
    const levelUpper = level.toUpperCase();
    if (levelUpper === 'ERROR' || levelUpper === 'FATAL') {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (levelUpper === 'WARN' || levelUpper === 'WARNING') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  // Get log level color
  const getLevelColor = (level: string | null) => {
    if (!level) return 'text-stone';
    const levelUpper = level.toUpperCase();
    if (levelUpper === 'ERROR' || levelUpper === 'FATAL') {
      return 'text-black font-medium';
    }
    if (levelUpper === 'WARN' || levelUpper === 'WARNING') {
      return 'text-mid-gray';
    }
    return 'text-silver';
  };

  // Sidebar content
  const sidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-medium text-black mb-3">
          File Information
        </h3>
        {selectedFile ? (
          <div className="space-y-2">
            <p className="text-xs font-mono text-stone break-all">
              {selectedFile}
            </p>
            <Badge>{logs.length} entries</Badge>
          </div>
        ) : (
          <p className="text-sm text-silver">No file loaded</p>
        )}
      </div>

      <div>
        <h3 className="font-display text-sm font-medium text-black mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button
            onClick={handleSelectFile}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Open File</span>
          </Button>
          <Button
            onClick={() => {
              clearLogs();
              setShowCharts(false);
            }}
            variant="secondary"
            disabled={isLoading || logs.length === 0}
            className="w-full"
          >
            Clear Logs
          </Button>
          <Button
            onClick={handleExport}
            variant="secondary"
            disabled={logs.length === 0}
            className="w-full flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-medium text-black mb-3">
          Filters
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-stone mb-1 block">Log Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as LogLevel)}
              className="w-full px-3 py-2 bg-snow border border-light-gray rounded-pill 
                       text-near-black text-sm focus:outline-none focus:ring-2 
                       focus:ring-[rgba(59,130,246,0.5)]"
            >
              <option value="ALL">All Levels</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warning</option>
              <option value="ERROR">Error</option>
              <option value="FATAL">Fatal</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-stone mb-1 block">Time Range Start</label>
            <input
              type="datetime-local"
              value={timeRangeStart || ''}
              onChange={(e) => setTimeRange(e.target.value || null, timeRangeEnd)}
              className="w-full px-3 py-2 bg-snow border border-light-gray rounded-pill 
                       text-near-black text-sm focus:outline-none focus:ring-2 
                       focus:ring-[rgba(59,130,246,0.5)]"
            />
          </div>
          <div>
            <label className="text-xs text-stone mb-1 block">Time Range End</label>
            <input
              type="datetime-local"
              value={timeRangeEnd || ''}
              onChange={(e) => setTimeRange(timeRangeStart, e.target.value || null)}
              className="w-full px-3 py-2 bg-snow border border-light-gray rounded-pill 
                       text-near-black text-sm focus:outline-none focus:ring-2 
                       focus:ring-[rgba(59,130,246,0.5)]"
            />
          </div>
          {(selectedLevel !== 'ALL' || timeRangeStart || timeRangeEnd) && (
            <Button
              onClick={() => {
                setSelectedLevel('ALL');
                setTimeRange(null, null);
              }}
              variant="secondary"
              className="w-full text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-medium text-black mb-3">
          Statistics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone">Total Logs</span>
            <span className="text-sm font-medium text-near-black">{logs.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone">Errors</span>
            <span className="text-sm font-medium text-near-black">
              {logs.filter((l) => l.level?.toUpperCase() === 'ERROR' || l.level?.toUpperCase() === 'FATAL').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone">Warnings</span>
            <span className="text-sm font-medium text-near-black">
              {logs.filter((l) => l.level?.toUpperCase() === 'WARN' || l.level?.toUpperCase() === 'WARNING').length}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-light-gray pt-4">
        <NetworkSources />
      </div>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="border-b border-light-gray px-8 py-6">
          <div className="flex gap-3">
            <Input
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search logs... (e.g., ERROR, timeout, etc.)"
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
            >
              Search
            </Button>
          </div>
        </div>

        {/* Query Builder */}
        <QueryBuilder onSearch={executeSearch} isLoading={isLoading} onRestore={restoreOriginalLogs} />

        {/* Error Message */}
        {error && (
          <div className="m-6">
            <Card className="p-4 bg-snow">
              <p className="text-black font-medium">{error}</p>
            </Card>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="m-6">
            <Card className="p-4 bg-snow">
              <p className="text-stone">Loading...</p>
            </Card>
          </div>
        )}

        {/* Charts */}
        {showCharts && <LogCharts logs={logs} />}

        {/* Log Count */}
        <div className="px-8 py-4 flex items-center justify-between">
          <p className="text-stone text-sm">
            {logs.length} log entries
          </p>
          {logs.length > 0 && (
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center gap-2 text-stone hover:text-near-black transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">{showCharts ? 'Hide' : 'Show'} Charts</span>
            </button>
          )}
        </div>

        {/* Log Table */}
        <div className="px-8 pb-8">
          <Card>
            <VirtualLogTable
              logs={logs}
              selectedLevel={selectedLevel}
              timeRangeStart={timeRangeStart}
              timeRangeEnd={timeRangeEnd}
            />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
