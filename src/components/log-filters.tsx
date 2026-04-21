import React from 'react';
import { LogLevel } from '@/store';
import { Button } from './ui';

interface LogFiltersProps {
  selectedLevel: LogLevel;
  setSelectedLevel: (level: LogLevel) => void;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  setTimeRange: (start: string | null, end: string | null) => void;
}

export const LogFilters: React.FC<LogFiltersProps> = ({
  selectedLevel,
  setSelectedLevel,
  timeRangeStart,
  timeRangeEnd,
  setTimeRange,
}) => {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray mb-3">
        Filters
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-mid-gray mb-1.5 block">Log Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LogLevel)}
            className="w-full px-3 py-2 bg-dark border border-border-dark rounded-8 
                     text-off-white text-sm focus:outline-none focus:ring-1 
                     focus:ring-supabase-green transition-all duration-200"
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
          <label className="text-[10px] uppercase tracking-wider text-mid-gray mb-1.5 block">Time Range Start</label>
          <input
            type="datetime-local"
            value={timeRangeStart || ''}
            onChange={(e) => setTimeRange(e.target.value || null, timeRangeEnd)}
            className="w-full px-3 py-2 bg-dark border border-border-dark rounded-8 
                     text-off-white text-sm focus:outline-none focus:ring-1 
                     focus:ring-supabase-green transition-all duration-200"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-mid-gray mb-1.5 block">Time Range End</label>
          <input
            type="datetime-local"
            value={timeRangeEnd || ''}
            onChange={(e) => setTimeRange(timeRangeStart, e.target.value || null)}
            className="w-full px-3 py-2 bg-dark border border-border-dark rounded-8 
                     text-off-white text-sm focus:outline-none focus:ring-1 
                     focus:ring-supabase-green transition-all duration-200"
          />
        </div>
        {(selectedLevel !== 'ALL' || timeRangeStart || timeRangeEnd) && (
          <Button
            onClick={() => {
              setSelectedLevel('ALL');
              setTimeRange(null, null);
            }}
            variant="ghost"
            className="w-full text-xs text-supabase-green"
          >
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
};
