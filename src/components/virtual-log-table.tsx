'use client';

import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LogEntry } from '@/lib/tauri';
import { LogLevel } from '@/store';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface VirtualLogTableProps {
  logs: LogEntry[];
  selectedLevel: LogLevel;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
}

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

const matchesLevel = (logLevel: string | null, selectedLevel: LogLevel): boolean => {
  if (selectedLevel === 'ALL') return true;
  if (!logLevel) return false;
  const logUpper = logLevel.toUpperCase();
  if (selectedLevel === 'WARN') {
    return logUpper === 'WARN' || logUpper === 'WARNING';
  }
  return logUpper === selectedLevel;
};

const matchesTimeRange = (timestamp: string | null, start: string | null, end: string | null): boolean => {
  if (!timestamp) return true;

  // Normalize timestamp to Date object for proper comparison
  const tsDate = new Date(timestamp);
  if (isNaN(tsDate.getTime())) return true; // Can't parse, include anyway

  if (start) {
    const startDate = new Date(start);
    if (!isNaN(startDate.getTime()) && tsDate < startDate) return false;
  }
  if (end) {
    const endDate = new Date(end);
    if (!isNaN(endDate.getTime()) && tsDate > endDate) return false;
  }
  return true;
};

export const VirtualLogTable: React.FC<VirtualLogTableProps> = ({
  logs,
  selectedLevel,
  timeRangeStart,
  timeRangeEnd,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter logs based on level and time range
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const levelMatch = matchesLevel(log.level, selectedLevel);
      const timeMatch = matchesTimeRange(log.timestamp, timeRangeStart, timeRangeEnd);
      return levelMatch && timeMatch;
    });
  }, [logs, selectedLevel, timeRangeStart, timeRangeEnd]);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  if (filteredLogs.length === 0 && logs.length > 0) {
    return (
      <div className="px-6 py-22 text-center text-stone">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-silver" />
        <p className="text-lg font-display">No logs match the current filters</p>
        <p className="text-sm mt-2">Try adjusting your filter criteria</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Table Header - Fixed */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-snow border-b border-light-gray text-stone text-xs font-medium sticky top-0 z-10">
        <div className="col-span-2">Timestamp</div>
        <div className="col-span-1">Level</div>
        <div className="col-span-5">Message</div>
        <div className="col-span-2">IP / Status</div>
        <div className="col-span-2">Source</div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="divide-y divide-light-gray"
        style={{
          height: '600px',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const log = filteredLogs[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                className="grid grid-cols-12 gap-4 px-6 hover:bg-snow transition-colors absolute left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="col-span-2 font-mono text-xs text-stone truncate">
                  {log.timestamp || '-'}
                </div>
                <div className="col-span-1">
                  <div className={`flex items-center gap-1 ${getLevelColor(log.level)}`}>
                    {getLevelIcon(log.level)}
                    <span className="text-xs truncate">{log.level || '-'}</span>
                  </div>
                </div>
                <div className="col-span-5 font-mono text-xs text-near-black break-words">
                  {log.message}
                  {log.request_path && (
                    <span className="ml-2 text-silver">[{log.request_path}]</span>
                  )}
                </div>
                <div className="col-span-2 font-mono text-xs text-silver">
                  {log.source_ip && (
                    <span className="block">{log.source_ip}</span>
                  )}
                  {log.status_code && (
                    <span className={`block ${log.status_code.startsWith('5') ? 'text-black font-medium' : log.status_code.startsWith('4') ? 'text-mid-gray' : 'text-stone'}`}>
                      {log.status_code}
                    </span>
                  )}
                  {!log.source_ip && !log.status_code && `#${log.line_number}`}
                </div>
                <div className="col-span-2 font-mono text-xs text-silver truncate">
                  {log.source || `#${log.line_number}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
