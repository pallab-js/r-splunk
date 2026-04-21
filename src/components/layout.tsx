import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, sidebar }) => {
  return (
    <main className="flex min-h-screen flex-col bg-dark selection:bg-supabase-green/30">
      {/* Header */}
      <header className="border-b border-border-dark px-8 py-4 bg-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-supabase-green rounded-8 flex items-center justify-center">
              <div className="w-4 h-4 bg-dark rounded-full" />
            </div>
            <h1 className="font-display text-2xl font-medium text-off-white tracking-tight leading-hero">
              R-Splunk
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] tracking-technical text-mid-gray uppercase border border-border-dark px-2 py-1 rounded-6">
              Privacy-First • Local-First
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-80 border-r border-border-dark bg-dark px-6 py-6 h-[calc(100vh-65px)] sticky top-[65px] overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#121212]">
          {children}
        </div>
      </div>
    </main>
  );
};
