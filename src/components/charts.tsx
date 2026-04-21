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
import { Card } from './ui';

interface LogChartsProps {
  logs: LogEntry[];
}

const SUPABASE_COLORS = {
  green: '#3ecf8e',
  dark: '#171717',
  nearBlack: '#0f0f0f',
  borderDark: '#2e2e2e',
  midGray: '#898989',
  offWhite: '#fafafa',
  crimson: '#e93d82',
  yellow: '#ffca16',
  purple: '#8e4ec6',
  blue: '#3e63dd',
};

export const LogCharts: React.FC<LogChartsProps> = ({ logs }) => {
  const timelineData = logs.reduce<Array<{ time: string; count: number }>>((acc, log) => {
    if (!log.timestamp) return acc;
    const date = new Date(log.timestamp);
    if (isNaN(date.getTime())) return acc;

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existing = acc.find((item) => item.time === time);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ time, count: 1 });
    }
    return acc;
  }, []);

  const levelCounts = logs.reduce<Record<string, number>>((acc, log) => {
    const level = log.level?.toUpperCase() || 'UNKNOWN';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(levelCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const levelColors: Record<string, string> = {
    ERROR: SUPABASE_COLORS.crimson,
    FATAL: SUPABASE_COLORS.crimson,
    WARN: SUPABASE_COLORS.yellow,
    WARNING: SUPABASE_COLORS.yellow,
    INFO: SUPABASE_GREEN,
    DEBUG: SUPABASE_COLORS.purple,
    UNKNOWN: SUPABASE_COLORS.midGray,
  };

  const getLevelColor = (name: string) => levelColors[name] || SUPABASE_COLORS.blue;
  const SUPABASE_GREEN = SUPABASE_COLORS.green;

  if (logs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-8 bg-near-black/20 border-border-dark">
        <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray mb-6">
          Traffic Intensity
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={timelineData.slice(-30)}>
            <CartesianGrid strokeDasharray="3 3" stroke={SUPABASE_COLORS.borderDark} vertical={false} />
            <XAxis
              dataKey="time"
              stroke={SUPABASE_COLORS.midGray}
              tick={{ fill: SUPABASE_COLORS.midGray, fontSize: 10, fontFamily: 'ui-monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke={SUPABASE_COLORS.midGray}
              tick={{ fill: SUPABASE_COLORS.midGray, fontSize: 10, fontFamily: 'ui-monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: SUPABASE_COLORS.nearBlack,
                border: `1px solid ${SUPABASE_COLORS.borderDark}`,
                borderRadius: '8px',
                color: SUPABASE_COLORS.offWhite,
                fontSize: '12px',
                fontFamily: 'ui-monospace',
              }}
              cursor={{ fill: 'rgba(62, 207, 142, 0.05)' }}
            />
            <Bar
              dataKey="count"
              fill={SUPABASE_GREEN}
              radius={[2, 2, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-8 bg-near-black/20 border-border-dark">
        <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray mb-6">
          Severity Distribution
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getLevelColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: SUPABASE_COLORS.nearBlack,
                border: `1px solid ${SUPABASE_COLORS.borderDark}`,
                borderRadius: '8px',
                color: SUPABASE_COLORS.offWhite,
                fontSize: '12px',
                fontFamily: 'ui-monospace',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
