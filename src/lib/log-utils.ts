import React from 'react';
import { AlertCircle, Info, AlertTriangle, ShieldAlert, Terminal, MessageSquare } from 'lucide-react';

export const getLevelIcon = (level: string | null) => {
  if (!level) return React.createElement(MessageSquare, { className: "w-3.5 h-3.5" });
  const levelUpper = level.toUpperCase();
  if (levelUpper === 'ERROR') return React.createElement(AlertCircle, { className: "w-3.5 h-3.5" });
  if (levelUpper === 'FATAL') return React.createElement(ShieldAlert, { className: "w-3.5 h-3.5" });
  if (levelUpper === 'WARN' || levelUpper === 'WARNING') return React.createElement(AlertTriangle, { className: "w-3.5 h-3.5" });
  if (levelUpper === 'DEBUG' || levelUpper === 'TRACE') return React.createElement(Terminal, { className: "w-3.5 h-3.5" });
  return React.createElement(Info, { className: "w-3.5 h-3.5" });
};

export const getLevelColor = (level: string | null) => {
  if (!level) return 'text-mid-gray';
  const levelUpper = level.toUpperCase();
  if (levelUpper === 'ERROR' || levelUpper === 'FATAL') {
    return 'text-crimson-4';
  }
  if (levelUpper === 'WARN' || levelUpper === 'WARNING') {
    return 'text-yellow-A7';
  }
  if (levelUpper === 'INFO') {
    return 'text-supabase-green';
  }
  if (levelUpper === 'DEBUG' || levelUpper === 'TRACE') {
    return 'text-purple-5';
  }
  return 'text-light-gray';
};
