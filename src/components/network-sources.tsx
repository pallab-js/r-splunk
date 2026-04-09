'use client';

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Play, Square, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui';

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
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPort, setNewPort] = useState(9999);
  const [newTls, setNewTls] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const result = await invoke<NetworkSource[]>('get_network_sources');
      setSources(result);
    } catch (e) {
      console.error('Failed to load sources:', e);
    }
  };

  const addSource = async () => {
    if (!newName.trim()) return;

    // Security: Validate port range
    if (newPort < 1024 || newPort > 65535) {
      console.error('Port must be between 1024 and 65535');
      return;
    }

    try {
      await invoke('add_network_source', {
        name: newName,
        port: newPort,
        use_tls: newTls,
      });
      setNewName('');
      setNewPort(9999);
      setNewTls(false);
      setShowForm(false);
      await loadSources();
    } catch (e) {
      console.error('Failed to add source:', e);
    }
  };

  const removeSource = async (id: string) => {
    try {
      await invoke('remove_network_source', { id });
      await loadSources();
    } catch (e) {
      console.error('Failed to remove source:', e);
    }
  };

  const startServer = async (id: string) => {
    try {
      await invoke('start_network_server', { id });
      await loadSources();
    } catch (e) {
      console.error('Failed to start server:', e);
    }
  };

  const getStatusIcon = (status: NetworkSource['status']) => {
    if (status === 'Connected') return <Wifi className="w-4 h-4 text-black" />;
    if (status === 'Connecting') return <WifiOff className="w-4 h-4 text-stone animate-pulse" />;
    if (typeof status === 'object' && 'Error' in status) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    return <WifiOff className="w-4 h-4 text-silver" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-medium text-black">
          Network Sources
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1 text-stone hover:text-near-black transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showForm && (
        <div className="p-3 bg-white border border-light-gray rounded-container space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Source name"
            className="w-full px-3 py-2 bg-snow border border-light-gray rounded-pill 
                     text-near-black text-sm focus:outline-none focus:ring-2 
                     focus:ring-[rgba(59,130,246,0.5)]"
          />
          <input
            type="number"
            value={newPort}
            onChange={(e) => setNewPort(Number(e.target.value))}
            placeholder="Port (1024-65535)"
            min={1024}
            max={65535}
            className="w-full px-3 py-2 bg-snow border border-light-gray rounded-pill
                     text-near-black text-sm focus:outline-none focus:ring-2
                     focus:ring-[rgba(59,130,246,0.5)]"
          />
          <label className="flex items-center gap-2 text-xs text-stone">
            <input
              type="checkbox"
              checked={newTls}
              onChange={(e) => setNewTls(e.target.checked)}
            />
            Enable TLS
          </label>
          <div className="flex gap-2">
            <Button onClick={addSource} className="flex-1 text-xs py-2">
              Add
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant="secondary"
              className="flex-1 text-xs py-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {sources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between p-3 bg-white border border-light-gray rounded-container"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(source.status)}
            <div className="min-w-0">
              <p className="text-sm font-medium text-near-black truncate">
                {source.name}
              </p>
              <p className="text-xs text-stone">
                {source.address}:{source.port}
                {source.use_tls && ' (TLS)'}
              </p>
              {typeof source.status === 'object' && 'Error' in source.status && (
                <p className="text-xs text-red-500 mt-1 truncate">
                  {source.status.Error}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!source.enabled && (
              <button
                onClick={() => startServer(source.id)}
                className="p-1 text-stone hover:text-near-black transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => removeSource(source.id)}
              className="p-1 text-stone hover:text-near-black transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {sources.length === 0 && !showForm && (
        <p className="text-xs text-silver text-center">No network sources</p>
      )}
    </div>
  );
};
