import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui';

interface FileActionsProps {
  onSelectFile: () => void;
  onClearLogs: () => void;
  onExport: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
  hasLogs: boolean;
}

export const FileActions: React.FC<FileActionsProps> = ({
  onSelectFile,
  onClearLogs,
  onExport,
  onExportCsv,
  isLoading,
  hasLogs,
}) => {
  return (
    <div>
      <h3 className="font-display text-sm font-medium text-black mb-3">
        Quick Actions
      </h3>
      <div className="space-y-2">
        <Button
          onClick={onSelectFile}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>Open File</span>
        </Button>
        <Button
          onClick={onClearLogs}
          variant="secondary"
          disabled={isLoading || !hasLogs}
          className="w-full"
        >
          Clear Logs
        </Button>
        <Button
          onClick={onExport}
          variant="secondary"
          disabled={!hasLogs}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON</span>
        </Button>
        <Button
          onClick={onExportCsv}
          variant="secondary"
          disabled={!hasLogs}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </Button>
      </div>
    </div>
  );
};
