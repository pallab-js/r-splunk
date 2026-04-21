import React from 'react';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

// Get log level icon
export const getLevelIcon = (level: string | null) => {
  if (!level) return null;
  const levelUpper = level.toUpperCase();
  if (levelUpper === 'ERROR' || levelUpper === 'FATAL') {
    return React.createElement(AlertCircle, { className: "w-4 h-4" });
  }
  if (levelUpper === 'WARN' || levelUpper === 'WARNING') {
    return React.createElement(AlertTriangle, { className: "w-4 h-4" });
  }
  return React.createElement(Info, { className: "w-4 h-4" });
};

// Get log level color
export const getLevelColor = (level: string | null) => {
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
