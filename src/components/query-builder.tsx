'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X, Search, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { Button, Card } from './ui';

export type QueryOperator = 'AND' | 'OR' | 'NOT';
export type QueryField = 'message' | 'level' | 'timestamp';
export type QueryMatch = 'contains' | 'equals' | 'startswith' | 'endswith' | 'regex';

export interface QueryRule {
  id: string;
  field: QueryField;
  match: QueryMatch;
  value: string;
  operator: QueryOperator;
}

interface QueryBuilderProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  onRestore?: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const FIELD_LABELS: Record<QueryField, string> = {
  message: 'Message',
  level: 'Log Level',
  timestamp: 'Timestamp',
};

const MATCH_OPTIONS: Record<QueryField, { value: QueryMatch; label: string }[]> = {
  message: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startswith', label: 'Starts With' },
    { value: 'endswith', label: 'Ends With' },
    { value: 'regex', label: 'Regex' },
  ],
  level: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
  ],
  timestamp: [
    { value: 'equals', label: 'Equals' },
    { value: 'startswith', label: 'Starts With' },
  ],
};

const buildQueryString = (rules: QueryRule[]): string => {
  if (rules.length === 0) return '';

  const sanitizeQueryValue = (value: string): string => {
    return value
      .replace(/[+\-&|!(){}[\]\^"~*?:\\/]/g, '\\$&')
      .slice(0, 1000);
  };

  const buildRuleQuery = (rule: QueryRule): string => {
    const escapedValue = sanitizeQueryValue(rule.value);
    switch (rule.field) {
      case 'level': return `level:"${escapedValue}"`;
      case 'message':
        switch (rule.match) {
          case 'equals': return `message:"${escapedValue}"`;
          case 'startswith': return `message:"${escapedValue}"`;
          case 'endswith': return `message:"${escapedValue}"`;
          case 'regex': return `message:/${rule.value.slice(0, 500)}/`;
          default: return `message:"${escapedValue}"`;
        }
      case 'timestamp': return `timestamp:"${escapedValue}"`;
      default: return `"${escapedValue}"`;
    }
  };

  return rules
    .map((rule, index) => {
      const ruleQuery = buildRuleQuery(rule);
      if (index === 0) {
        return rule.operator === 'NOT' ? `NOT ${ruleQuery}` : ruleQuery;
      }
      return `${rule.operator} ${ruleQuery}`;
    })
    .join(' ');
};

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onSearch, isLoading }) => {
  const [rules, setRules] = useState<QueryRule[]>([
    { id: generateId(), field: 'message', match: 'contains', value: '', operator: 'AND' },
  ]);
  const [isExpanded, setIsExpanded] = useState(false);

  const addRule = useCallback(() => {
    setRules((prev) => [
      ...prev,
      { id: generateId(), field: 'message', match: 'contains', value: '', operator: 'AND' },
    ]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<QueryRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const handleSearch = useCallback(() => {
    const query = buildQueryString(rules);
    onSearch(query);
  }, [rules, onSearch]);

  const handleClear = useCallback(() => {
    setRules([
      { id: generateId(), field: 'message', match: 'contains', value: '', operator: 'AND' },
    ]);
    onSearch('');
  }, [onSearch]);

  return (
    <Card className="border-border-dark overflow-hidden bg-near-black/20">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-near-black/40 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <Search className={`w-4 h-4 ${isExpanded ? 'text-supabase-green' : 'text-mid-gray'}`} />
          <span className="text-xs font-mono uppercase tracking-technical text-off-white">Complex Query Mode</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-mid-gray" />
        ) : (
          <ChevronDown className="w-4 h-4 text-mid-gray" />
        )}
      </button>

      {/* Query Builder Content */}
      {isExpanded && (
        <div className="px-6 py-6 border-t border-border-dark animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-3 group">
                {/* Operator Selector */}
                {index > 0 ? (
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value as QueryOperator })}
                    className="w-20 px-2 py-1.5 bg-near-black border border-border-dark rounded-6 
                             text-off-white text-[10px] uppercase font-mono tracking-wider focus:outline-none focus:ring-1 
                             focus:ring-supabase-green transition-all"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </select>
                ) : (
                  <div className="w-20 flex justify-center">
                    <Terminal className="w-3.5 h-3.5 text-mid-gray/40" />
                  </div>
                )}

                {/* Field Selector */}
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(rule.id, { field: e.target.value as QueryField })}
                  className="px-3 py-1.5 bg-near-black border border-border-dark rounded-6 
                           text-off-white text-xs focus:outline-none focus:ring-1 
                           focus:ring-supabase-green transition-all"
                >
                  <option value="message">Message</option>
                  <option value="level">Level</option>
                  <option value="timestamp">Timestamp</option>
                </select>

                {/* Match Type Selector */}
                <select
                  value={rule.match}
                  onChange={(e) => updateRule(rule.id, { match: e.target.value as QueryMatch })}
                  className="px-3 py-1.5 bg-near-black border border-border-dark rounded-6 
                           text-off-white text-xs focus:outline-none focus:ring-1 
                           focus:ring-supabase-green transition-all"
                >
                  {MATCH_OPTIONS[rule.field].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Value Input */}
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  placeholder={`Enter ${FIELD_LABELS[rule.field].toLowerCase()} filter...`}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-1.5 bg-near-black border border-border-dark rounded-pill 
                           text-off-white text-xs placeholder:text-dark-gray
                           focus:outline-none focus:ring-1 focus:ring-supabase-green transition-all"
                />

                {/* Remove Button */}
                <button
                  onClick={() => removeRule(rule.id)}
                  disabled={rules.length === 1}
                  className="p-1.5 text-dark-gray hover:text-crimson-4 transition-colors 
                           disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-8">
            <Button onClick={addRule} variant="ghost" className="text-supabase-green text-xs flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clause</span>
            </Button>

            <div className="flex gap-4">
              <Button onClick={handleClear} variant="ghost" className="text-xs" disabled={isLoading}>
                Reset
              </Button>
              <Button onClick={handleSearch} variant="primary" className="text-xs px-8" disabled={isLoading || rules.every((r) => !r.value.trim())}>
                Execute Query
              </Button>
            </div>
          </div>

          {/* Generated Query Preview */}
          {rules.some((r) => r.value.trim()) && (
            <div className="mt-6 p-4 bg-near-black/40 border border-border-dark rounded-8 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-3 h-3 text-mid-gray" />
                <span className="text-[10px] uppercase font-mono tracking-technical text-mid-gray">Synthesized String</span>
              </div>
              <code className="text-xs font-mono text-supabase-green break-all">
                {buildQueryString(rules) || '(empty)'}
              </code>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
