import React from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
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
      <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray mb-3">
        Quick Actions
      </h3>
      <div className="space-y-3">
        <Button
          onClick={onSelectFile}
          disabled={isLoading}
          variant="primary"
          className="w-full"
        >
          <FileText className="w-4 h-4" />
          <span>Open File</span>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onExport}
            variant="secondary"
            disabled={!hasLogs}
            className="w-full text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </Button>
          <Button
            onClick={onExportCsv}
            variant="secondary"
            disabled={!hasLogs}
            className="w-full text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </Button>
        </div>
        <Button
          onClick={onClearLogs}
          variant="ghost"
          disabled={isLoading || !hasLogs}
          className="w-full text-xs text-dark-gray hover:text-off-white"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All Logs</span>
        </Button>
      </div>
    </div>
  );
};
