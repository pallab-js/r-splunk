import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, sidebar }) => {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-light-gray px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-3xl font-medium text-black">
            R-Splunk Log Analyzer
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-stone text-sm font-body">
              Privacy-First • Local-First
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-80 border-r border-light-gray bg-snow px-6 py-6">
            {sidebar}
          </aside>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </main>
  );
};
