const express = require('express');
const PouchDB = require('pouchdb');
const expressPouchDB = require('express-pouchdb');
const path = require('path');
const fs = require('fs');

class SyncServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.dbPath = options.dbPath || path.join(__dirname, '../../sync-server-data');
    this.app = express();
    this.server = null;
    this.isRunning = false;
    
    // Ensure database directory exists
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('Sync server is already running');
      return;
    }

    try {
      // CORS middleware
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      // Setup PouchDB with LevelDB adapter
      PouchDB.defaults({
        prefix: this.dbPath + '/'
      });

      // Setup express-pouchdb for replication
      const pouchApp = expressPouchDB(PouchDB, {
        mode: 'fullCouchDB',
        overrideMode: {
          include: [
            'routes/root',
            'routes/log',
            'routes/session',
            'routes/all-dbs',
            'routes/db',
            'routes/bulk-docs',
            'routes/bulk-get',
            'routes/all-docs',
            'routes/changes',
            'routes/compact',
            'routes/revs-diff',
            'routes/security',
            'routes/view-cleanup'
          ]
        }
      });

      // Mount PouchDB app
      this.app.use('/sync', pouchApp);

      // API endpoints for monitoring sync status
      this.app.get('/api/stats', async (req, res) => {
        try {
          const collections = ['products', 'categories', 'transactions', 'users', 'settings'];
          const stats = {};

          for (const collection of collections) {
            try {
              const db = new PouchDB(collection);
              const info = await db.info();
              stats[collection] = {
                doc_count: info.doc_count,
                update_seq: info.update_seq,
                disk_size: info.disk_size || 0
              };
            } catch (error) {
              stats[collection] = { error: error.message };
            }
          }

          res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            collections: stats
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      // API endpoint to get connected machines
      this.app.get('/api/machines', async (req, res) => {
        try {
          // This would typically come from a separate machines registry
          // For now, we'll return basic info
          res.json({
            machines: [],
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      // Start the server
      this.server = this.app.listen(this.port, () => {
        console.log(`POS Sync Server started on port ${this.port}`);
        console.log(`Database path: ${this.dbPath}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        console.log(`Sync endpoint: http://localhost:${this.port}/sync`);
        this.isRunning = true;
      });

      this.server.on('error', (error) => {
        console.error('Sync server error:', error);
        this.isRunning = false;
      });

    } catch (error) {
      console.error('Failed to start sync server:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning || !this.server) {
      console.log('Sync server is not running');
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Sync server stopped');
        this.isRunning = false;
        this.server = null;
        resolve();
      });
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      dbPath: this.dbPath,
      url: this.isRunning ? `http://localhost:${this.port}` : null
    };
  }
}

module.exports = SyncServer;
