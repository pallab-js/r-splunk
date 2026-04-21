import React from 'react';
import { LogLevel } from '@/store';
import { Button } from '@/components/ui';

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
  );
};
