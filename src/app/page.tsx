'use client';

import { useState, useEffect, useMemo } from 'react';
import { onLogStreamBatch } from '@/lib/tauri';
import { useAppStore } from '@/store';
import { DashboardLayout } from '@/components/layout';
import { LogCharts } from '@/components/charts';
import { VirtualLogTable } from '@/components/virtual-log-table';
import { QueryBuilder } from '@/components/query-builder';
import { Card } from '@/components/ui';
import { BarChart3, Terminal } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { Sidebar } from '@/components/sidebar';
import { useLogActions } from '@/hooks/use-log-actions';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const store = useAppStore();
  const { handleSelectFile, handleExport, handleExportCsv, executeSearch, handleSearch } = useLogActions();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unlisten = onLogStreamBatch((entries) => {
      useAppStore.getState().addLogs(entries);
      setShowCharts(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
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
        selectedFile={store.selectedFile} 
        logsCount={store.logs.length} 
        isLoading={store.isLoading}
        selectedLevel={store.selectedLevel} 
        setSelectedLevel={store.setSelectedLevel}
        timeRangeStart={store.timeRangeStart} 
        timeRangeEnd={store.timeRangeEnd} 
        setTimeRange={store.setTimeRange}
        stats={stats} 
        onSelectFile={handleSelectFile} 
        onExport={handleExport} 
        onExportCsv={handleExportCsv}
        onClearLogs={() => { 
          store.clearLogs(); 
          setShowCharts(false); 
        }}
      />
    }>
      <div className="flex flex-col h-full">
        <SearchBar 
          value={store.searchQuery} 
          onChange={store.setSearchQuery} 
          onSearch={handleSearch} 
          isLoading={store.isLoading} 
        />
        
        <div className="flex-1 overflow-auto p-8 space-y-8">
          <div className="max-w-screen-2xl mx-auto space-y-8">
            {/* Query Builder Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-supabase-green" />
                <h2 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray">Query Console</h2>
              </div>
              <QueryBuilder onSearch={executeSearch} isLoading={store.isLoading} onRestore={store.restoreOriginalLogs} />
            </section>

            {/* Status Messages */}
            {store.error && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <Card className="p-4 bg-crimson-4/10 border-crimson-4/30 text-crimson-4 font-mono text-xs uppercase tracking-wider flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-crimson-4 animate-pulse" />
                  {store.error}
                </Card>
              </div>
            )}
            
            {store.isLoading && (
              <div className="animate-in fade-in duration-300">
                <Card className="p-4 bg-supabase-green/5 border-supabase-green/20 text-supabase-green font-mono text-xs uppercase tracking-wider flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-supabase-green animate-bounce" />
                  Indexing logs in progress...
                </Card>
              </div>
            )}

            {/* Visualization Section */}
            {showCharts && (
              <section className="animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-supabase-green" />
                    <h2 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray">Visual Insights</h2>
                  </div>
                </div>
                <LogCharts logs={store.logs} />
              </section>
            )}

            {/* Log Table Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-supabase-green" />
                  <p className="font-mono text-[10px] uppercase tracking-technical text-mid-gray">
                    Live Buffer — {store.logs.length.toLocaleString()} entries
                  </p>
                </div>
                {store.logs.length > 0 && (
                  <button 
                    onClick={() => setShowCharts(!showCharts)} 
                    className="font-mono text-[10px] uppercase tracking-technical text-mid-gray hover:text-off-white transition-colors flex items-center gap-2"
                  >
                    {showCharts ? '[ Disable Analytics ]' : '[ Enable Analytics ]'}
                  </button>
                )}
              </div>
              
              <Card className="bg-near-black/30 border-border-dark shadow-2xl">
                <VirtualLogTable 
                  logs={store.logs} 
                  selectedLevel={store.selectedLevel} 
                  timeRangeStart={store.timeRangeStart} 
                  timeRangeEnd={store.timeRangeEnd} 
                />
              </Card>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
