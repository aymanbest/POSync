const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron');
const { getDatabase, getMachineId, addDefaultFields, updateWithTracking } = require('./rxdb-setup');
// const DatabaseMigration = require('./migration');
const SyncManager = require('./sync-manager');

// Get user data path for storing the databases
const userDataPath = app.getPath('userData');

// Legacy NeDB setup (kept for backward compatibility during transition)
const legacyDb = {
  products: new Datastore({ 
    filename: path.join(userDataPath, 'products.db'), 
    autoload: true 
  }),
  categories: new Datastore({ 
    filename: path.join(userDataPath, 'categories.db'), 
    autoload: true 
  }),
  transactions: new Datastore({ 
    filename: path.join(userDataPath, 'transactions.db'), 
    autoload: true,
    timestampData: true
  }),
  users: new Datastore({ 
    filename: path.join(userDataPath, 'users.db'), 
    autoload: true 
  }),
  settings: new Datastore({ 
    filename: path.join(userDataPath, 'settings.db'), 
    autoload: true 
  })
};

// Create indexes for legacy DB
legacyDb.products.ensureIndex({ fieldName: 'barcode', unique: true, sparse: true });
legacyDb.categories.ensureIndex({ fieldName: 'name', unique: true });
legacyDb.users.ensureIndex({ fieldName: 'username', unique: true });

// Global variables
let rxDatabase = null;
let syncManager = null;
let useRxDb = false; // Flag to determine which database to use

// Initialize database system
async function initializeDatabase() {
  try {
    console.log('Initializing database system...');    
    // Force use of NeDB for now (disable RxDB completely)
    console.log('Using NeDB only - RxDB disabled for stability');
    useRxDb = false;

    // Just use NeDB
    return { success: true, useRxDb, database: legacyDb };
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Fall back to NeDB
    useRxDb = false;
    return { success: false, useRxDb, database: legacyDb, error };
  }
}

// Get current database instance
async function getCurrentDatabase() {
  if (useRxDb) {
    return rxDatabase || await getDatabase();
  }
  return legacyDb;
}

// Get sync manager instance
function getSyncManager() {
  return syncManager;
}

// Update sync settings
async function updateSyncSettings(syncServerUrl, syncEnabled = true) {
  if (syncManager) {
    await syncManager.updateSyncSettings(syncServerUrl, syncEnabled);
  } else if (useRxDb && syncEnabled && syncServerUrl) {
    const db = await getCurrentDatabase();
    syncManager = new SyncManager(db, syncServerUrl);
    await syncManager.startSync();
  }
}

// Helper function to get settings (works with both NeDB and RxDB)
async function getSettings() {
  try {
    if (useRxDb) {
      const db = await getCurrentDatabase();
      const settingsDoc = await db.settings.getSettings().exec();
      return settingsDoc ? settingsDoc.toJSON() : null;
    } else {
      return new Promise((resolve, reject) => {
        legacyDb.settings.findOne({}, (err, doc) => {
          if (err) reject(err);
          else resolve(doc);
        });
      });
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
}

// Export both legacy and new interfaces
const db = useRxDb ? null : legacyDb; // Legacy interface

module.exports = {
  // Legacy NeDB interface (for backward compatibility)
  ...legacyDb,
  
  // New RxDB interface
  initializeDatabase,
  getCurrentDatabase,
  getSyncManager,
  updateSyncSettings,
  getMachineId,
  addDefaultFields,
  updateWithTracking,
  getSettings,
    // Migration utilities (commented out for now)
  // DatabaseMigration,
  
  // Status
  isUsingRxDb: () => useRxDb,
  
  // Legacy fallback
  get products() { return useRxDb ? null : legacyDb.products; },
  get categories() { return useRxDb ? null : legacyDb.categories; },
  get transactions() { return useRxDb ? null : legacyDb.transactions; },
  get users() { return useRxDb ? null : legacyDb.users; },
  get settings() { return useRxDb ? null : legacyDb.settings; }
};