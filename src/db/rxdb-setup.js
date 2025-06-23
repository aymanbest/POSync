const { createRxDatabase, addRxPlugin } = require('rxdb');

const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

// Import minimal plugins
try {
  const { RxDBUpdatePlugin } = require('rxdb/plugins/update');
  
  // Add plugins
  addRxPlugin(RxDBUpdatePlugin);
} catch (error) {
  console.log('Some plugins failed to load:', error.message);
}

const path = require('path');
const { app } = require('electron');
const os = require('os');
const crypto = require('crypto');

// Import schemas
const {
  productSchema,
  categorySchema,
  transactionSchema,
  userSchema,
  settingsSchema,
  syncLogSchema
} = require('./schemas');

// Add PouchDB plugins (not needed for Dexie storage)
// addPouchPlugin(PouchdbAdapterLeveldb);
// addPouchPlugin(PouchdbAdapterMemory);

let database = null;
let machineId = null;

// Generate or get machine ID
function getMachineId() {
  if (machineId) return machineId;
  
  // Create a unique machine ID based on hostname and network interfaces
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();
  const macAddresses = [];
  
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
        macAddresses.push(iface.mac);
      }
    }
  }
  
  const uniqueString = `${hostname}-${macAddresses.join('-')}`;
  machineId = crypto.createHash('md5').update(uniqueString).digest('hex');
  
  return machineId;
}

// Create the RxDB database
async function createDatabase() {
  if (database) {
    return database;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'rxdb');

  console.log('Creating RxDB database at:', dbPath);

  database = await createRxDatabase({
    name: dbPath,
    storage: getRxStorageMemory(),
    multiInstance: false,
    eventReduce: true,
    cleanupPolicy: {
      minimumDeletedTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      minimumCollectionAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      runEach: 1000 * 60 * 60 * 24, // run each day
      awaitReplicationsInSync: true,
      waitForLeadership: false
    }
  });

  // Add collections
  await database.addCollections({
    products: {
      schema: productSchema,
      methods: {
        // Custom methods for products
        updateStock: function(newStock) {
          return this.update({
            $set: {
              stock: newStock,
              updatedAt: new Date().toISOString(),
              lastModified: Date.now()
            }
          });
        },
        
        decrementStock: function(quantity) {
          return this.update({
            $set: {
              stock: Math.max(0, this.stock - quantity),
              updatedAt: new Date().toISOString(),
              lastModified: Date.now()
            }
          });
        }
      },
      statics: {
        // Static methods for products collection
        findByBarcode: function(barcode) {
          return this.findOne({
            selector: {
              barcode: barcode
            }
          });
        },
        
        findByCategory: function(categoryId) {
          return this.find({
            selector: {
              categoryId: categoryId,
              isActive: true
            }
          });
        },
        
        getLowStockProducts: function(threshold = 5) {
          return this.find({
            selector: {
              stock: { $lte: threshold },
              isActive: true
            }
          });
        }
      }
    },

    categories: {
      schema: categorySchema,
      statics: {
        findActive: function() {
          return this.find({
            selector: {
              isActive: true
            }
          });
        }
      }
    },

    transactions: {
      schema: transactionSchema,
      statics: {
        findByReceiptId: function(receiptId) {
          return this.findOne({
            selector: {
              receiptId: receiptId
            }
          });
        },
        
        findByDateRange: function(startDate, endDate) {
          return this.find({
            selector: {
              date: {
                $gte: startDate,
                $lte: endDate
              }
            },
            sort: [{ date: 'desc' }]
          });
        },
        
        findByTimeFrame: function(timeFrame) {
          const now = new Date();
          let startDate;
          
          switch (timeFrame) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'year':
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            default:
              startDate = new Date(0);
          }
          
          return this.findByDateRange(startDate.toISOString(), now.toISOString());
        }
      }
    },

    users: {
      schema: userSchema,
      statics: {
        findByUsername: function(username) {
          return this.findOne({
            selector: {
              username: username
            }
          });
        },
        
        findActive: function() {
          return this.find({
            selector: {
              active: true
            }
          });
        }
      }
    },

    settings: {
      schema: settingsSchema,
      statics: {
        getSettings: function() {
          return this.findOne();
        }
      }
    },

    syncLogs: {
      schema: syncLogSchema,
      statics: {
        logOperation: function(collection, operation, documentId, success, error = null) {
          return this.insert({
            _id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            collection,
            operation,
            documentId,
            timestamp: new Date().toISOString(),
            machineId: getMachineId(),
            success,
            error
          });
        }
      }
    }
  });

  console.log('RxDB database created successfully');
  return database;
}

// Helper function to add default fields to documents
function addDefaultFields(doc) {
  const now = new Date().toISOString();
  const timestamp = Date.now();
  
  return {
    ...doc,
    _id: doc._id || `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: doc.createdAt || now,
    updatedAt: now,
    lastModified: timestamp,
    machineId: getMachineId()
  };
}

// Helper function to update document with modification tracking
function updateWithTracking(update) {
  return {
    ...update,
    updatedAt: new Date().toISOString(),
    lastModified: Date.now()
  };
}

// Get database instance
async function getDatabase() {
  if (!database) {
    await createDatabase();
  }
  return database;
}

// Close database
async function closeDatabase() {
  if (database) {
    await database.destroy();
    database = null;
  }
}

module.exports = {
  createDatabase,
  getDatabase,
  closeDatabase,
  getMachineId,
  addDefaultFields,
  updateWithTracking
};
