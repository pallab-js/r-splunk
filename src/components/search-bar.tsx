import React from 'react';
import { Search } from 'lucide-react';
import { Input, Button } from '@/components/ui';

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
    <div className="border-b border-light-gray px-8 py-6">
      <div className="flex gap-3">
        <Input
          icon={<Search className="w-4 h-4" />}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Search logs... (e.g., ERROR, timeout, etc.)"
          className="flex-1"
        />
        <Button
          onClick={onSearch}
          disabled={isLoading || !value.trim()}
        >
          Search
        </Button>
      </div>
    </div>
  );
};
