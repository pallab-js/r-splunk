'use client';

import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LogEntry } from '@/lib/tauri';
import { LogLevel } from '@/store';
import { getLevelIcon, getLevelColor } from '@/lib/log-utils';
import { FileText, Clock, Server } from 'lucide-react';

interface VirtualLogTableProps {
  logs: LogEntry[];
  selectedLevel: LogLevel;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
}

const matchesLevel = (logLevel: string | null, selectedLevel: LogLevel): boolean => {
  if (selectedLevel === 'ALL') return true;
  if (!logLevel) return false;
  const level = logLevel.toUpperCase();
  if (selectedLevel === 'WARN' && (level === 'WARN' || level === 'WARNING')) return true;
  return level === selectedLevel;
};

const matchesTimeRange = (timestamp: string | null, start: string | null, end: string | null): boolean => {
  if (!start && !end) return true;
  if (!timestamp) return false;
  const tsDate = new Date(timestamp);
  if (start && tsDate < new Date(start)) return false;
  if (end && tsDate > new Date(end)) return false;
  return true;
};

export const VirtualLogTable: React.FC<VirtualLogTableProps> = ({
  logs,
  selectedLevel,
  timeRangeStart,
  timeRangeEnd,
}) => {
  const filteredLogs = useMemo(() => {
    return logs.filter(
      (log) =>
        matchesLevel(log.level, selectedLevel) &&
        matchesTimeRange(log.timestamp, timeRangeStart, timeRangeEnd)
    );
  }, [logs, selectedLevel, timeRangeStart, timeRangeEnd]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto rounded-8 bg-near-black/50 scrollbar-thin scrollbar-thumb-border-dark"
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
          const levelColor = getLevelColor(log.level);
          
          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full border-b border-border-dark/50 hover:bg-dark-border/30 transition-colors group px-4 py-2 flex items-center gap-4 text-xs font-mono"
              style={{
                height: '40px',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="w-8 text-dark-gray text-[10px] text-right shrink-0">
                {log.line_number}
              </div>
              
              <div className="w-40 flex items-center gap-2 text-mid-gray shrink-0">
                <Clock className="w-3 h-3 opacity-50" />
                <span className="truncate">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--:--'}</span>
              </div>
              
              <div className={`w-20 flex items-center gap-1.5 uppercase tracking-wider font-bold shrink-0 ${levelColor}`}>
                {getLevelIcon(log.level)}
                <span>{log.level || 'NONE'}</span>
              </div>
              
              <div className="flex-1 text-off-white truncate group-hover:text-supabase-green transition-colors">
                {log.message}
              </div>

              {log.source_ip && (
                <div className="w-32 flex items-center gap-2 text-mid-gray shrink-0">
                  <Server className="w-3 h-3 opacity-50" />
                  <span className="truncate">{log.source_ip}</span>
                </div>
              )}

              {log.source_file && (
                <div className="w-40 flex items-center gap-2 text-dark-gray shrink-0 group-hover:text-mid-gray">
                  <FileText className="w-3 h-3 opacity-50" />
                  <span className="truncate max-w-[140px]" title={log.source_file}>
                    {log.source_file.split('/').pop()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filteredLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-dark-gray py-20">
          <p className="font-mono text-[10px] uppercase tracking-widest mb-2">Null Result</p>
          <p className="text-xs">No logs match current filters</p>
        </div>
      )}
    </div>
  );
};
