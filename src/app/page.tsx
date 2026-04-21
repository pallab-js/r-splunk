'use client';

import { useState, useEffect, useMemo } from 'react';
import { onLogStreamBatch } from '@/lib/tauri';
import { useAppStore } from '@/store';
import { DashboardLayout } from '@/components/layout';
import { LogCharts } from '@/components/charts';
import { VirtualLogTable } from '@/components/virtual-log-table';
import { QueryBuilder } from '@/components/query-builder';
import { Card } from '@/components/ui';
import { BarChart3 } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { Sidebar } from '@/components/sidebar';
import { useLogActions } from '@/hooks/use-log-actions';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const store = useAppStore();
  const { handleSelectFile, handleExport, handleExportCsv, executeSearch, handleSearch } = useLogActions();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const unlisten = onLogStreamBatch((entries) => { useAppStore.getState().addLogs(entries); setShowCharts(true); });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const stats = useMemo(() => {
    const errors = store.logs.filter((l) => l.level?.toUpperCase() === 'ERROR' || l.level?.toUpperCase() === 'FATAL').length;
    const warnings = store.logs.filter((l) => l.level?.toUpperCase() === 'WARN' || l.level?.toUpperCase() === 'WARNING').length;
    return { total: store.logs.length, errors, warnings };
  }, [store.logs]);

  if (!mounted) return null;

  return (
    <DashboardLayout sidebar={
      <Sidebar 
        selectedFile={store.selectedFile} logsCount={store.logs.length} isLoading={store.isLoading}
        selectedLevel={store.selectedLevel} setSelectedLevel={store.setSelectedLevel}
        timeRangeStart={store.timeRangeStart} timeRangeEnd={store.timeRangeEnd} setTimeRange={store.setTimeRange}
        stats={stats} onSelectFile={handleSelectFile} onExport={handleExport} onExportCsv={handleExportCsv}
        onClearLogs={() => { store.clearLogs(); setShowCharts(false); }}
      />
    }>
      <div className="max-w-7xl mx-auto">
        <SearchBar value={store.searchQuery} onChange={store.setSearchQuery} onSearch={handleSearch} isLoading={store.isLoading} />
        <QueryBuilder onSearch={executeSearch} isLoading={store.isLoading} onRestore={store.restoreOriginalLogs} />
        {store.error && <div className="m-6"><Card className="p-4 bg-snow text-black font-medium">{store.error}</Card></div>}
        {store.isLoading && <div className="m-6"><Card className="p-4 bg-snow text-stone">Loading...</Card></div>}
        {showCharts && <LogCharts logs={store.logs} />}
        <div className="px-8 py-4 flex items-center justify-between">
          <p className="text-stone text-sm">{store.logs.length} log entries</p>
          {store.logs.length > 0 && (
            <button onClick={() => setShowCharts(!showCharts)} className="flex items-center gap-2 text-stone hover:text-near-black transition-colors">
              <BarChart3 className="w-4 h-4" /> <span className="text-sm">{showCharts ? 'Hide' : 'Show'} Charts</span>
            </button>
          )}
        </div>
        <div className="px-8 pb-8">
          <Card>
            <VirtualLogTable logs={store.logs} selectedLevel={store.selectedLevel} timeRangeStart={store.timeRangeStart} timeRangeEnd={store.timeRangeEnd} />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
