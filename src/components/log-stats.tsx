import React from 'react';

interface LogStatsProps {
  stats: { total: number; errors: number; warnings: number };
}

export const LogStats: React.FC<LogStatsProps> = ({ stats }) => {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray mb-3">
        Statistics
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 rounded-8 bg-[#1a1a1a] border border-border-dark">
          <span className="text-xs text-light-gray/60">Total Logs</span>
          <span className="text-sm font-medium text-off-white">{stats.total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center p-2 rounded-8 bg-near-black border border-crimson-4/30">
          <span className="text-xs text-crimson-4">Errors</span>
          <span className="text-sm font-medium text-off-white">{stats.errors.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center p-2 rounded-8 bg-near-black border border-yellow-A7/30">
          <span className="text-xs text-yellow-A7">Warnings</span>
          <span className="text-sm font-medium text-off-white">{stats.warnings.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
