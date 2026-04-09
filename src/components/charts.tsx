'use client';

import React from 'react';
import { LogEntry } from '@/lib/tauri';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface LogChartsProps {
  logs: LogEntry[];
}

// Grayscale color palette
const GRAYSCALE_COLORS = {
  black: '#000000',
  nearBlack: '#262626',
  midGray: '#525252',
  stone: '#737373',
  silver: '#a3a3a3',
  borderLight: '#d4d4d4',
  snow: '#fafafa',
};

export const LogCharts: React.FC<LogChartsProps> = ({ logs }) => {
  // Prepare data for timeline chart (logs over time)
  // Normalize timestamps to Date objects for proper grouping
  const timelineData = logs.reduce<Array<{ time: string; count: number }>>((acc, log) => {
    if (!log.timestamp) return acc;

    // Try to parse the timestamp as a Date
    const date = new Date(log.timestamp);
    if (isNaN(date.getTime())) return acc; // Skip unparseable timestamps

    // Group by minute: format as "YYYY-MM-DD HH:MM"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const time = `${year}-${month}-${day} ${hours}:${minutes}`;

    const existing = acc.find((item) => item.time === time);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ time, count: 1 });
    }

    return acc;
  }, []);

  // Prepare data for pie chart (log levels distribution)
  const levelCounts = logs.reduce<Record<string, number>>((acc, log) => {
    const level = log.level?.toUpperCase() || 'UNKNOWN';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(levelCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 levels

  // Assign grayscale colors to pie chart segments
  const pieColors = Object.values(GRAYSCALE_COLORS).slice(0, 5);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Timeline Chart */}
      <div className="bg-white border border-light-gray rounded-container p-6">
        <h3 className="font-display text-lg font-medium text-black mb-4">
          Log Timeline
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={timelineData.slice(-20)}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAYSCALE_COLORS.borderLight} />
            <XAxis
              dataKey="time"
              stroke={GRAYSCALE_COLORS.stone}
              tick={{ fill: GRAYSCALE_COLORS.stone, fontSize: 12 }}
            />
            <YAxis
              stroke={GRAYSCALE_COLORS.stone}
              tick={{ fill: GRAYSCALE_COLORS.stone, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: GRAYSCALE_COLORS.snow,
                border: `1px solid ${GRAYSCALE_COLORS.borderLight}`,
                borderRadius: '12px',
                boxShadow: 'none',
              }}
            />
            <Bar
              dataKey="count"
              fill={GRAYSCALE_COLORS.nearBlack}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white border border-light-gray rounded-container p-6">
        <h3 className="font-display text-lg font-medium text-black mb-4">
          Log Levels
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#888888"
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: GRAYSCALE_COLORS.snow,
                border: `1px solid ${GRAYSCALE_COLORS.borderLight}`,
                borderRadius: '12px',
                boxShadow: 'none',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
