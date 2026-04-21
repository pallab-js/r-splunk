import React from 'react';
import { Badge } from '@/components/ui';
import { NetworkSources } from '@/components/network-sources';
import { FileActions } from '@/components/file-actions';
import { LogFilters } from '@/components/log-filters';
import { LogStats } from '@/components/log-stats';
import { LogLevel } from '@/store';

interface SidebarProps {
  selectedFile: string | null;
  logsCount: number;
  isLoading: boolean;
  selectedLevel: LogLevel;
  setSelectedLevel: (level: LogLevel) => void;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  setTimeRange: (start: string | null, end: string | null) => void;
  stats: { total: number; errors: number; warnings: number };
  onSelectFile: () => void;
  onClearLogs: () => void;
  onExport: () => void;
  onExportCsv: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedFile,
  logsCount,
  isLoading,
  selectedLevel,
  setSelectedLevel,
  timeRangeStart,
  timeRangeEnd,
  setTimeRange,
  stats,
  onSelectFile,
  onClearLogs,
  onExport,
  onExportCsv,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-medium text-black mb-3">File Information</h3>
        {selectedFile ? (
          <div className="space-y-2">
            <p className="text-xs font-mono text-stone break-all">{selectedFile}</p>
            <Badge>{logsCount} entries</Badge>
          </div>
        ) : (
          <p className="text-sm text-silver">No file loaded</p>
        )}
      </div>

      <FileActions 
        onSelectFile={onSelectFile}
        onClearLogs={onClearLogs}
        onExport={onExport}
        onExportCsv={onExportCsv}
        isLoading={isLoading}
        hasLogs={logsCount > 0}
      />

      <LogFilters 
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        timeRangeStart={timeRangeStart}
        timeRangeEnd={timeRangeEnd}
        setTimeRange={setTimeRange}
      />

      <LogStats stats={stats} />

      <div className="border-t border-light-gray pt-4">
        <NetworkSources />
      </div>
    </div>
  );
};
