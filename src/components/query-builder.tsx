'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui';

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

  // Security: Sanitize query values to prevent injection attacks
  const sanitizeQueryValue = (value: string): string => {
    // Escape special Tantivy query characters
    return value
      .replace(/[+\-&|!(){}[\]\^"~*?:\\/]/g, '\\$&')
      .slice(0, 1000); // Limit query length to prevent DoS
  };

  const buildRuleQuery = (rule: QueryRule): string => {
    const escapedValue = sanitizeQueryValue(rule.value);

    switch (rule.field) {
      case 'level':
        return `level:"${escapedValue}"`;
      case 'message':
        switch (rule.match) {
          case 'equals':
            return `message:"${escapedValue}"`;
          case 'startswith':
            return `message:"${escapedValue}"`;
          case 'endswith':
            return `message:"${escapedValue}"`;
          case 'regex':
            // For regex, we pass through but still limit length
            return `message:/${rule.value.slice(0, 500)}/`;
          default:
            return `message:"${escapedValue}"`;
        }
      case 'timestamp':
        return `timestamp:"${escapedValue}"`;
      default:
        return `"${escapedValue}"`;
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

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onSearch, isLoading, onRestore }) => {
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
    // onSearch('') already calls restoreOriginalLogs internally, no need to call onRestore
    onSearch('');
  }, [onSearch]);

  return (
    <div className="border-b border-light-gray">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-8 py-3 hover:bg-snow transition-colors"
      >
        <div className="flex items-center gap-2 text-stone">
          <Search className="w-4 h-4" />
          <span className="text-sm font-medium">Advanced Query Builder</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-stone" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone" />
        )}
      </button>

      {/* Query Builder Content */}
      {isExpanded && (
        <div className="px-8 py-6 bg-snow">
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-3">
                {/* Operator (hidden for first rule) */}
                {index > 0 ? (
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value as QueryOperator })}
                    className="px-3 py-2 bg-white border border-light-gray rounded-pill 
                             text-near-black text-sm focus:outline-none focus:ring-2 
                             focus:ring-[rgba(59,130,246,0.5)]"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </select>
                ) : (
                  <div className="w-20" />
                )}

                {/* Field Selector */}
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(rule.id, { field: e.target.value as QueryField })}
                  className="px-3 py-2 bg-white border border-light-gray rounded-pill 
                           text-near-black text-sm focus:outline-none focus:ring-2 
                           focus:ring-[rgba(59,130,246,0.5)]"
                >
                  <option value="message">Message</option>
                  <option value="level">Level</option>
                  <option value="timestamp">Timestamp</option>
                </select>

                {/* Match Type */}
                <select
                  value={rule.match}
                  onChange={(e) => updateRule(rule.id, { match: e.target.value as QueryMatch })}
                  className="px-3 py-2 bg-white border border-light-gray rounded-pill 
                           text-near-black text-sm focus:outline-none focus:ring-2 
                           focus:ring-[rgba(59,130,246,0.5)]"
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
                  placeholder={`Enter ${FIELD_LABELS[rule.field].toLowerCase()}...`}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-2 bg-white border border-light-gray rounded-pill 
                           text-near-black text-sm placeholder:text-silver
                           focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.5)]"
                />

                {/* Remove Button */}
                <button
                  onClick={() => removeRule(rule.id)}
                  disabled={rules.length === 1}
                  className="p-2 text-stone hover:text-near-black transition-colors 
                           disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button onClick={addRule} variant="secondary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add Rule</span>
            </Button>

            <div className="flex gap-3">
              <Button onClick={handleClear} variant="secondary" disabled={isLoading}>
                Clear
              </Button>
              <Button onClick={handleSearch} disabled={isLoading || rules.every((r) => !r.value.trim())}>
                Search
              </Button>
            </div>
          </div>

          {/* Generated Query Preview */}
          {rules.some((r) => r.value.trim()) && (
            <div className="mt-4 p-3 bg-white border border-light-gray rounded-container">
              <p className="text-xs text-stone mb-1">Generated Query:</p>
              <code className="text-sm font-mono text-near-black">
                {buildQueryString(rules) || '(empty)'}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
