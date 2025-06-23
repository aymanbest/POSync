import React, { useState, useEffect } from 'react';
import { 
  IconCloudComputing, 
  IconSettings, 
  IconServer, 
  IconUsers, 
  IconActivity, 
  IconAlertCircle,
  IconCircleDashedCheck,
  IconXboxX,
  IconLoader2,
  IconRefresh,
  IconDatabase,
  IconArrowUp,
  IconArrowDown,
  IconClock,
  IconWifi,
  IconWifiOff
} from '@tabler/icons-react';

const SyncSettings = () => {
  const [syncConfig, setSyncConfig] = useState({
    enabled: false,
    serverUrl: 'http://localhost:3001',
    interval: 30, // seconds
    autoReconnect: true,
    conflictResolution: 'server-wins', // 'server-wins', 'client-wins', 'manual'
    machineId: 'pos-' + Math.random().toString(36).substr(2, 9)
  });

  const [syncStatus, setSyncStatus] = useState({
    connected: false,
    lastSync: null,
    isActive: false,
    error: null
  });

  const [serverStats, setServerStats] = useState({
    connectedMachines: 0,
    totalDocuments: 0,
    lastActivity: null
  });

  const [connectedMachines, setConnectedMachines] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load configuration on mount
  useEffect(() => {
    loadSyncConfig();
    loadSyncStatus();
    loadSyncLogs();
    
    // Set up periodic status updates
    const statusInterval = setInterval(() => {
      if (syncConfig.enabled) {
        updateSyncStatus();
        updateServerStats();
        updateConnectedMachines();
      }
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [syncConfig.enabled]);

  const loadSyncConfig = async () => {
    try {
      const config = await window.api?.sync?.getConfig?.() || syncConfig;
      setSyncConfig(config);
    } catch (error) {
      console.error('Failed to load sync config:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await window.api?.sync?.getStatus?.() || syncStatus;
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const logs = await window.api?.sync?.getLogs?.() || [];
      setSyncLogs(logs.slice(-50)); // Keep last 50 logs
    } catch (error) {
      console.error('Failed to load sync logs:', error);
    }
  };

  const updateSyncStatus = async () => {
    try {
      const status = await window.api?.sync?.getStatus?.();
      if (status) {
        setSyncStatus(status);
      }
    } catch (error) {
      // Silently handle errors for periodic updates
    }
  };

  const updateServerStats = async () => {
    try {
      const stats = await window.api?.sync?.getServerStats?.();
      if (stats) {
        setServerStats(stats);
      }
    } catch (error) {
      // Silently handle errors for periodic updates
    }
  };

  const updateConnectedMachines = async () => {
    try {
      const machines = await window.api?.sync?.getConnectedMachines?.() || [];
      setConnectedMachines(machines);
    } catch (error) {
      // Silently handle errors for periodic updates
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfigChange = (key, value) => {
    setSyncConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      const result = await window.api?.sync?.updateConfig?.(syncConfig);
      if (result?.success !== false) {
        showNotification('Sync configuration saved successfully', 'success');
        loadSyncStatus();
      } else {
        throw new Error(result?.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save sync config:', error);
      showNotification('Failed to save configuration: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSync = async () => {
    setIsLoading(true);
    try {
      const newEnabled = !syncConfig.enabled;
      const result = newEnabled 
        ? await window.api?.sync?.start?.(syncConfig)
        : await window.api?.sync?.stop?.();
      
      if (result?.success !== false) {
        setSyncConfig(prev => ({ ...prev, enabled: newEnabled }));
        showNotification(
          newEnabled ? 'Sync started successfully' : 'Sync stopped successfully', 
          'success'
        );
        loadSyncStatus();
      } else {
        throw new Error(result?.message || 'Failed to toggle sync');
      }
    } catch (error) {
      console.error('Failed to toggle sync:', error);
      showNotification('Failed to toggle sync: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await window.api?.sync?.testConnection?.(syncConfig.serverUrl);
      if (result?.success) {
        showNotification('Connection test successful', 'success');
      } else {
        throw new Error(result?.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      showNotification('Connection test failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcePush = async (collection = null) => {
    setIsLoading(true);
    try {
      const result = await window.api?.sync?.forcePush?.(collection);
      if (result?.success !== false) {
        showNotification(
          collection 
            ? `Force push completed for ${collection}` 
            : 'Force push completed for all collections', 
          'success'
        );
        loadSyncStatus();
        loadSyncLogs();
      } else {
        throw new Error(result?.message || 'Force push failed');
      }
    } catch (error) {
      console.error('Force push failed:', error);
      showNotification('Force push failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcePull = async (collection = null) => {
    setIsLoading(true);
    try {
      const result = await window.api?.sync?.forcePull?.(collection);
      if (result?.success !== false) {
        showNotification(
          collection 
            ? `Force pull completed for ${collection}` 
            : 'Force pull completed for all collections', 
          'success'
        );
        loadSyncStatus();
        loadSyncLogs();
      } else {
        throw new Error(result?.message || 'Force pull failed');
      }
    } catch (error) {
      console.error('Force pull failed:', error);
      showNotification('Force pull failed: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (syncStatus.isActive) {
      return <IconLoader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    } else if (syncStatus.connected) {
      return <IconCircleDashedCheck className="w-5 h-5 text-green-500" />;
    } else if (syncStatus.error) {
      return <IconXboxX className="w-5 h-5 text-red-500" />;
    } else {
      return <IconWifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!syncConfig.enabled) return 'Disabled';
    if (syncStatus.isActive) return 'Syncing...';
    if (syncStatus.connected) return 'Connected';
    if (syncStatus.error) return 'Error';
    return 'Disconnected';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
            notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-dark-800 dark:text-white flex items-center">
            <IconCloudComputing size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
            Central Server Sync
          </h2>
          <p className="text-sm text-gray-600 dark:text-dark-300 mt-1">
            Synchronize data across multiple POS machines through a central server
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${
            syncStatus.connected && syncConfig.enabled ? 'text-green-600 dark:text-green-400' : 
            syncStatus.error ? 'text-red-600 dark:text-red-400' : 
            'text-gray-500 dark:text-gray-400'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Sync Toggle */}
      <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-dark-800 dark:text-white">Enable Synchronization</h3>
            <p className="text-sm text-gray-600 dark:text-dark-300">
              Turn on to sync data with other POS machines
            </p>
          </div>
          <button
            onClick={handleToggleSync}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              syncConfig.enabled 
                ? 'bg-primary-500 dark:bg-primary-600' 
                : 'bg-gray-200 dark:bg-gray-700'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                syncConfig.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <h3 className="font-medium text-dark-800 dark:text-white flex items-center">
          <IconSettings size={18} className="mr-2" />
          Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
              Server URL
            </label>
            <input
              type="text"
              value={syncConfig.serverUrl}
              onChange={(e) => handleConfigChange('serverUrl', e.target.value)}
              placeholder="http://server:3001"
              className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
              Sync Interval (seconds)
            </label>
            <input
              type="number"
              value={syncConfig.interval}
              onChange={(e) => handleConfigChange('interval', parseInt(e.target.value))}
              min="10"
              max="3600"
              className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
              Machine ID
            </label>
            <input
              type="text"
              value={syncConfig.machineId}
              onChange={(e) => handleConfigChange('machineId', e.target.value)}
              className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
              Conflict Resolution
            </label>
            <select
              value={syncConfig.conflictResolution}
              onChange={(e) => handleConfigChange('conflictResolution', e.target.value)}
              className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="server-wins">Server Wins</option>
              <option value="client-wins">Client Wins</option>
              <option value="manual">Manual Resolution</option>
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoReconnect"
            checked={syncConfig.autoReconnect}
            onChange={(e) => handleConfigChange('autoReconnect', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="autoReconnect" className="ml-2 text-sm text-gray-700 dark:text-dark-200">
            Auto-reconnect on connection loss
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSaveConfig}
            disabled={isLoading}
            className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={isLoading}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Test Connection
          </button>
        </div>
      </div>

      {/* Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-300">Server Status</p>
              <p className="font-medium text-dark-800 dark:text-white">
                {syncStatus.connected ? 'Online' : 'Offline'}
              </p>
            </div>
            <IconServer className={`w-8 h-8 ${
              syncStatus.connected ? 'text-green-500' : 'text-gray-400'
            }`} />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-300">Connected Machines</p>
              <p className="font-medium text-dark-800 dark:text-white">
                {serverStats.connectedMachines}
              </p>
            </div>
            <IconUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-300">Last Sync</p>
              <p className="font-medium text-dark-800 dark:text-white">
                {formatRelativeTime(syncStatus.lastSync)}
              </p>
            </div>
            <IconClock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Manual Sync Controls */}
      <div className="space-y-4">
        <h3 className="font-medium text-dark-800 dark:text-white flex items-center">
          <IconRefresh size={18} className="mr-2" />
          Manual Sync
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleForcePush()}
            disabled={!syncConfig.enabled || isLoading}
            className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            <IconArrowUp size={16} />
            <span>Push All</span>
          </button>
          
          <button
            onClick={() => handleForcePull()}
            disabled={!syncConfig.enabled || isLoading}
            className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            <IconArrowDown size={16} />
            <span>Pull All</span>
          </button>

          <button
            onClick={() => handleForcePush('products')}
            disabled={!syncConfig.enabled || isLoading}
            className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            <IconDatabase size={16} />
            <span>Push Products</span>
          </button>

          <button
            onClick={() => handleForcePull('products')}
            disabled={!syncConfig.enabled || isLoading}
            className="flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            <IconDatabase size={16} />
            <span>Pull Products</span>
          </button>
        </div>
      </div>

      {/* Connected Machines */}
      {connectedMachines.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-dark-800 dark:text-white flex items-center">
            <IconUsers size={18} className="mr-2" />
            Connected Machines
          </h3>
          
          <div className="space-y-2">
            {connectedMachines.map((machine, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-600/50 rounded-lg">
                <div>
                  <p className="font-medium text-dark-800 dark:text-white">{machine.id}</p>
                  <p className="text-sm text-gray-600 dark:text-dark-300">
                    Last seen: {formatRelativeTime(machine.lastSeen)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <IconWifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">Online</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-dark-800 dark:text-white flex items-center">
            <IconActivity size={18} className="mr-2" />
            Sync Activity
          </h3>
          <button
            onClick={loadSyncLogs}
            className="text-sm text-primary-500 dark:text-primary-400 hover:underline"
          >
            Refresh
          </button>
        </div>
        
        <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-50 dark:bg-dark-600/50 p-3 rounded-lg">
          {syncLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No sync activity yet
            </p>
          ) : (
            syncLogs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {formatTime(log.timestamp)}
                </span>
                <span className={`font-medium ${
                  log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                  log.level === 'success' ? 'text-green-600 dark:text-green-400' :
                  'text-gray-700 dark:text-gray-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Error Display */}
      {syncStatus.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <IconAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-400">Sync Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {syncStatus.error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncSettings;
