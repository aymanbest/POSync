const { replicateRxCollection } = require('rxdb/plugins/replication');
const PouchDB = require('pouchdb');
const { getMachineId } = require('./rxdb-setup');

class SyncManager {
  constructor(database, syncServerUrl) {
    this.database = database;
    this.syncServerUrl = syncServerUrl;
    this.replications = new Map();
    this.isOnline = false;
    this.retryTimeout = null;
    this.retryInterval = 30000; // 30 seconds
    this.maxRetries = 5;
    this.currentRetries = 0;
    this.lastSyncTime = null;
    this.lastError = null;
    this.config = {};
    
    // Collections to sync
    this.syncCollections = ['products', 'categories', 'transactions', 'users', 'settings'];
    
    // Check online status
    this.checkOnlineStatus();
    
    // Setup network event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  checkOnlineStatus() {
    if (typeof window !== 'undefined') {
      this.isOnline = window.navigator.onLine;
    } else {
      this.isOnline = true; // Assume online in Node.js environment
    }
  }

  handleOnline() {
    console.log('Network connection restored');
    this.isOnline = true;
    this.currentRetries = 0;
    this.startSync();
  }

  handleOffline() {
    console.log('Network connection lost');
    this.isOnline = false;
    this.stopSync();
  }

  async startSync() {
    if (!this.isOnline || !this.syncServerUrl) {
      console.log('Cannot start sync: offline or no sync server URL');
      return;
    }

    try {
      console.log('Starting sync with server:', this.syncServerUrl);

      // Test server connectivity
      await this.testServerConnection();

      // Start replication for each collection
      for (const collectionName of this.syncCollections) {
        await this.startCollectionSync(collectionName);
      }

      console.log('Sync started successfully');
      this.currentRetries = 0;

    } catch (error) {
      console.error('Failed to start sync:', error);
      this.scheduleRetry();
    }
  }

  async startCollectionSync(collectionName) {
    try {
      const collection = this.database[collectionName];
      if (!collection) {
        console.warn(`Collection ${collectionName} not found`);
        return;
      }

      // Stop existing replication if any
      if (this.replications.has(collectionName)) {
        await this.stopCollectionSync(collectionName);
      }

      const remoteUrl = `${this.syncServerUrl}/sync/${collectionName}`;
      
      // Configure replication options
      const replicationOptions = {
        remote: remoteUrl,
        waitForLeadership: true,
        direction: {
          pull: true,
          push: true
        },
        options: {
          live: true,
          retry: true,
          back_off_function: (delay) => {
            // Exponential backoff with jitter
            const jitter = Math.random() * 1000;
            return Math.min(30000, delay * 2) + jitter;
          }
        },
        query: {
          selector: {},
          sort: [{ lastModified: 'desc' }]
        }
      };

      // Start replication
      const replicationState = await replicateRxCollection({
        collection: collection,
        ...replicationOptions
      });      // Handle replication events
      replicationState.error$.subscribe(error => {
        console.error(`Sync error for ${collectionName}:`, error);
        this.lastError = error.message;
        this.logSyncOperation(collectionName, 'error', null, false, error.message);
      });

      replicationState.complete$.subscribe(info => {
        console.log(`Sync completed for ${collectionName}:`, info);
        this.lastSyncTime = new Date().toISOString();
        this.lastError = null;
        this.logSyncOperation(collectionName, 'complete', null, true);
      });

      replicationState.docs$.subscribe(docs => {
        console.log(`Synced ${docs.length} documents for ${collectionName}`);
        this.lastSyncTime = new Date().toISOString();
        docs.forEach(doc => {
          this.logSyncOperation(collectionName, 'sync', doc._id, true);
        });
      });

      this.replications.set(collectionName, replicationState);
      console.log(`Started sync for collection: ${collectionName}`);

    } catch (error) {
      console.error(`Failed to start sync for ${collectionName}:`, error);
      this.logSyncOperation(collectionName, 'start_error', null, false, error.message);
      throw error;
    }
  }

  async stopCollectionSync(collectionName) {
    const replicationState = this.replications.get(collectionName);
    if (replicationState) {
      await replicationState.cancel();
      this.replications.delete(collectionName);
      console.log(`Stopped sync for collection: ${collectionName}`);
    }
  }

  async stopSync() {
    console.log('Stopping sync...');
    
    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Stop all replications
    const stopPromises = Array.from(this.replications.keys()).map(
      collectionName => this.stopCollectionSync(collectionName)
    );

    await Promise.all(stopPromises);
    console.log('Sync stopped');
  }

  async testServerConnection() {
    try {
      const response = await fetch(`${this.syncServerUrl}/health`, {
        method: 'GET',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Server health check failed');
      }

      return true;
    } catch (error) {
      throw new Error(`Cannot connect to sync server: ${error.message}`);
    }
  }

  scheduleRetry() {
    if (this.currentRetries >= this.maxRetries) {
      console.log('Max retry attempts reached. Sync will be retried when network comes back online.');
      return;
    }

    this.currentRetries++;
    const delay = Math.min(this.retryInterval * Math.pow(2, this.currentRetries - 1), 300000); // Max 5 minutes

    console.log(`Scheduling sync retry ${this.currentRetries}/${this.maxRetries} in ${delay / 1000} seconds`);

    this.retryTimeout = setTimeout(() => {
      this.startSync();
    }, delay);
  }

  async logSyncOperation(collection, operation, documentId, success, error = null) {
    try {
      const syncLogs = this.database.syncLogs;
      if (syncLogs) {
        await syncLogs.logOperation(collection, operation, documentId, success, error);
      }
    } catch (logError) {
      console.error('Failed to log sync operation:', logError);
    }
  }

  async forcePush(collectionName = null) {
    if (!this.isOnline) {
      throw new Error('Cannot force push while offline');
    }

    const collections = collectionName ? [collectionName] : this.syncCollections;
    
    for (const name of collections) {
      const replicationState = this.replications.get(name);
      if (replicationState) {
        console.log(`Force pushing ${name}...`);
        await replicationState.run(); // Trigger immediate sync
      }
    }
  }

  async forcePull(collectionName = null) {
    if (!this.isOnline) {
      throw new Error('Cannot force pull while offline');
    }

    const collections = collectionName ? [collectionName] : this.syncCollections;
    
    for (const name of collections) {
      const replicationState = this.replications.get(name);
      if (replicationState) {
        console.log(`Force pulling ${name}...`);
        await replicationState.run(); // Trigger immediate sync
      }
    }
  }

  // Method to resolve conflicts (last-write-wins strategy)
  resolveConflict(docInDb, docFromRemote) {
    // Simple last-write-wins based on lastModified timestamp
    if (docFromRemote.lastModified > docInDb.lastModified) {
      return docFromRemote;
    }
    return docInDb;
  }
  // Get current sync configuration
  async getConfig() {
    return {
      enabled: this.replications.size > 0,
      serverUrl: this.syncServerUrl,
      interval: 30, // Default interval
      autoReconnect: true,
      conflictResolution: 'server-wins',
      machineId: getMachineId()
    };
  }

  // Update sync configuration
  async updateConfig(config) {
    if (config.serverUrl !== this.syncServerUrl) {
      await this.updateSyncSettings(config.serverUrl, config.enabled);
    }
    // Store other config options as needed
    this.config = { ...this.config, ...config };
  }
  // Get sync status with more details
  async getSyncStatus() {
    const now = new Date().toISOString();
    return {
      connected: this.isOnline && this.replications.size > 0,
      lastSync: this.lastSyncTime || null,
      isActive: this.replications.size > 0,
      error: this.lastError || null,
      serverUrl: this.syncServerUrl,
      activeReplications: this.replications.size,
      machineId: getMachineId(),
      timestamp: now
    };
  }
  async updateSyncSettings(newSyncServerUrl, syncEnabled = true) {
    const oldUrl = this.syncServerUrl;
    this.syncServerUrl = newSyncServerUrl;

    if (syncEnabled && newSyncServerUrl && oldUrl !== newSyncServerUrl) {
      // Stop current sync
      await this.stopSync();
      
      // Start with new URL
      await this.startSync();
    } else if (!syncEnabled) {
      await this.stopSync();
    }
  }

  // Get recent sync logs
  async getRecentSyncLogs(limit = 50) {
    // For now, return mock logs. In a real implementation, 
    // you would store logs in a collection or file
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'success',
        message: 'Sync completed successfully',
        collection: 'products'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'Starting sync process',
        collection: 'all'
      }
    ];
    
    return mockLogs.slice(-limit);
  }
}

module.exports = SyncManager;
