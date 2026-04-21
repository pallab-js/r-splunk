import React from 'react';
import { Badge } from './ui';
import { LogLevel } from '@/store';
import { FileActions } from './file-actions';
import { LogFilters } from './log-filters';
import { LogStats } from './log-stats';
import { NetworkSources } from './network-sources';

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
    <div className="space-y-8">
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray mb-3">
          File Information
        </h3>
        {selectedFile ? (
          <div className="space-y-3">
            <p className="text-xs font-mono text-light-gray/60 break-all leading-relaxed">
              {selectedFile}
            </p>
            <Badge>{logsCount} entries</Badge>
          </div>
        ) : (
          <p className="text-sm text-dark-gray italic">No file loaded</p>
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

      <div className="border-t border-border-dark pt-8">
        <NetworkSources />
      </div>
    </div>
  );
};
