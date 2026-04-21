import React from 'react';
import { Search } from 'lucide-react';
import { Input, Button } from './ui';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isLoading,
}) => {
  return (
    <div className="border-b border-border-dark px-8 py-6 bg-dark/40">
      <div className="max-w-screen-2xl mx-auto flex gap-3">
        <Input
          icon={<Search className="w-4 h-4" />}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Search logs... (e.g., ERROR, timeout, connection_reset)"
          className="flex-1 h-11 px-6 text-base"
        />
        <Button
          onClick={onSearch}
          disabled={isLoading || !value.trim()}
          className="h-11 px-8 rounded-pill font-medium"
        >
          Search
        </Button>
      </div>
    </div>
  );
};
