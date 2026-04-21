import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Play, Wifi, WifiOff, Globe } from 'lucide-react';
import { Button, Input, Badge } from './ui';

interface NetworkSource {
  id: string;
  name: string;
  address: string;
  port: number;
  enabled: boolean;
  use_tls: boolean;
  status: 'Disconnected' | 'Connecting' | 'Connected' | { Error: string };
}

export const NetworkSources: React.FC = () => {
  const [sources, setSources] = useState<NetworkSource[]>([]);
  const [newName, setNewName] = useState('');
  const [newPort, setNewPort] = useState(9999);
  const [newTls, setNewTls] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      const result = await invoke<NetworkSource[]>('get_network_sources');
      setSources(result);
    } catch (e) {
      console.error('Failed to load sources:', e);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const addSource = async () => {
    if (!newName.trim()) return;
    try {
      await invoke('add_network_source', {
        name: newName,
        port: newPort,
        useTls: newTls,
      });
      setNewName('');
      setIsAdding(false);
      await loadSources();
    } catch (e) {
      console.error('Failed to add source:', e);
    }
  };

  const removeSource = async (id: string) => {
    try {
      await invoke('remove_network_source', { id });
      await loadSources();
    } catch {
      // Ignore error
    }
  };

  const startServer = async (id: string) => {
    try {
      await invoke('start_network_server', { id });
      await loadSources();
    } catch {
      // Ignore error
    }
  };

  const stopServer = async (id: string) => {
    try {
      await invoke('stop_network_server', { id });
      await loadSources();
    } catch {
      // Ignore error
    }
  };

  const getStatusDisplay = (status: NetworkSource['status']) => {
    if (status === 'Connected') return <Badge className="bg-supabase-green/10 text-supabase-green border-supabase-green/20">Active</Badge>;
    if (status === 'Connecting') return <Badge className="bg-yellow-A7/10 text-yellow-A7 border-yellow-A7/20">Pending</Badge>;
    if (typeof status === 'object' && 'Error' in status) return <Badge className="bg-crimson-4/10 text-crimson-4 border-crimson-4/20">Error</Badge>;
    return <Badge className="bg-border-dark text-mid-gray border-border-dark">Idle</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] uppercase tracking-technical text-mid-gray">
          Network Sources
        </h3>
        <Button 
          variant="ghost" 
          onClick={() => setIsAdding(!isAdding)} 
          className="p-1 h-auto rounded-6 text-supabase-green"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isAdding && (
        <div className="p-3 bg-dark border border-border-dark rounded-8 space-y-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <Input
            placeholder="Source Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="py-1.5 px-3 text-xs"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Port"
              value={newPort}
              onChange={(e) => setNewPort(parseInt(e.target.value))}
              className="py-1.5 px-3 text-xs flex-1"
            />
            <label className="flex items-center gap-2 cursor-pointer bg-near-black px-3 py-1.5 rounded-pill border border-border-dark transition-colors hover:border-mid-border">
              <input
                type="checkbox"
                checked={newTls}
                onChange={(e) => setNewTls(e.target.checked)}
                className="accent-supabase-green"
              />
              <span className="text-[10px] text-light-gray/60 uppercase font-mono tracking-wider">TLS</span>
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={addSource} className="flex-1 text-xs py-1.5">Add</Button>
            <Button onClick={() => setIsAdding(false)} variant="ghost" className="flex-1 text-xs py-1.5">Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="p-3 bg-dark border border-border-dark rounded-8 group transition-all duration-200 hover:border-mid-border"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Globe className={`w-3.5 h-3.5 ${source.status === 'Connected' ? 'text-supabase-green' : 'text-mid-gray'}`} />
                <span className="text-xs font-medium text-off-white">{source.name}</span>
              </div>
              <button
                onClick={() => removeSource(source.id)}
                className="text-dark-gray hover:text-crimson-4 opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-mono text-mid-gray">
                {source.address}:{source.port} {source.use_tls && '(TLS)'}
              </div>
              <div className="flex items-center gap-2">
                {getStatusDisplay(source.status)}
                <button
                  onClick={() => source.status === 'Connected' ? stopServer(source.id) : startServer(source.id)}
                  className={`p-1 rounded-6 transition-all duration-200 ${
                    source.status === 'Connected' 
                    ? 'text-crimson-4 hover:bg-crimson-4/10' 
                    : 'text-supabase-green hover:bg-supabase-green/10'
                  }`}
                >
                  {source.status === 'Connected' ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ))}
        {sources.length === 0 && !isAdding && (
          <p className="text-[10px] text-dark-gray italic text-center py-2 uppercase tracking-widest">No Sources</p>
        )}
      </div>
    </div>
  );
};
