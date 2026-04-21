import React from 'react';

interface LogStatsProps {
  stats: {
    total: number;
    errors: number;
    warnings: number;
  };
}

export const LogStats: React.FC<LogStatsProps> = ({ stats }) => {
  return (
    <div>
      <h3 className="font-display text-sm font-medium text-black mb-3">
        Statistics
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone">Total Logs</span>
          <span className="text-sm font-medium text-near-black">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone">Errors</span>
          <span className="text-sm font-medium text-near-black">
            {stats.errors}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone">Warnings</span>
          <span className="text-sm font-medium text-near-black">
            {stats.warnings}
          </span>
        </div>
      </div>
    </div>
  );
};
