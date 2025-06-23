const db = require('../db');
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { seedDatabase } = require('../db/seeder');

// Helper to convert callbacks to promises for NeDB
const promisify = (dbMethod, ...args) => {
  return new Promise((resolve, reject) => {
    dbMethod(...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Helper to handle both RxDB and NeDB operations
async function executeDbOperation(operation) {
  const isUsingRxDb = db.isUsingRxDb();
  
  if (isUsingRxDb) {
    const rxDatabase = await db.getCurrentDatabase();
    return await operation.rxdb(rxDatabase);
  } else {
    return await operation.nedb();
  }
}

// Set up IPC handlers for database operations
const setupDbHandlers = () => {
  // Initialize database
  ipcMain.handle('db:initialize', async () => {
    try {
      return await db.initializeDatabase();
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  });

  // Get database status
  ipcMain.handle('db:getStatus', async () => {
    try {
      const syncManager = db.getSyncManager();
      return {
        isUsingRxDb: db.isUsingRxDb(),
        machineId: db.getMachineId(),
        syncStatus: syncManager ? syncManager.getSyncStatus() : null
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      throw error;
    }
  });

  // Sync operations
  ipcMain.handle('db:updateSyncSettings', async (event, syncServerUrl, syncEnabled) => {
    try {
      await db.updateSyncSettings(syncServerUrl, syncEnabled);
      return { success: true };
    } catch (error) {
      console.error('Error updating sync settings:', error);
      throw error;
    }
  });

  ipcMain.handle('db:forcePush', async (event, collectionName) => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        throw new Error('Sync not enabled');
      }
      await syncManager.forcePush(collectionName);
      return { success: true };
    } catch (error) {
      console.error('Error forcing push:', error);
      throw error;
    }
  });

  ipcMain.handle('db:forcePull', async (event, collectionName) => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        throw new Error('Sync not enabled');
      }
      await syncManager.forcePull(collectionName);
      return { success: true };
    } catch (error) {
      console.error('Error forcing pull:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getSyncLogs', async (event, limit = 50) => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        return [];
      }
      return await syncManager.getRecentSyncLogs(limit);
    } catch (error) {
      console.error('Error getting sync logs:', error);
      return [];
    }
  });

  // New Sync API handlers
  ipcMain.handle('sync:getConfig', async () => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        return {
          enabled: false,
          serverUrl: 'http://localhost:3001',
          interval: 30,
          autoReconnect: true,
          conflictResolution: 'server-wins',
          machineId: db.getMachineId() || 'pos-' + Math.random().toString(36).substr(2, 9)
        };
      }
      return await syncManager.getConfig();
    } catch (error) {
      console.error('Error getting sync config:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:updateConfig', async (event, config) => {
    try {
      await db.updateSyncSettings(config.serverUrl, config.enabled);
      const syncManager = db.getSyncManager();
      if (syncManager) {
        await syncManager.updateConfig(config);
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating sync config:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:getStatus', async () => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        return {
          connected: false,
          lastSync: null,
          isActive: false,
          error: null
        };
      }
      return await syncManager.getSyncStatus();
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        connected: false,
        lastSync: null,
        isActive: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('sync:start', async (event, config) => {
    try {
      await db.updateSyncSettings(config.serverUrl, true);
      const syncManager = db.getSyncManager();
      if (syncManager) {
        await syncManager.startSync();
      }
      return { success: true };
    } catch (error) {
      console.error('Error starting sync:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:stop', async () => {
    try {
      const syncManager = db.getSyncManager();
      if (syncManager) {
        await syncManager.stopSync();
      }
      return { success: true };
    } catch (error) {
      console.error('Error stopping sync:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:testConnection', async (event, serverUrl) => {
    try {
      const axios = require('axios');
      const response = await axios.get(`${serverUrl}/health`, { 
        timeout: 5000 
      });
      if (response.status === 200) {
        return { success: true, message: 'Connection successful' };
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('sync:forcePush', async (event, collection) => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        throw new Error('Sync not enabled');
      }
      await syncManager.forcePush(collection);
      return { success: true };
    } catch (error) {
      console.error('Error forcing push:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:forcePull', async (event, collection) => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        throw new Error('Sync not enabled');
      }
      await syncManager.forcePull(collection);
      return { success: true };
    } catch (error) {
      console.error('Error forcing pull:', error);
      throw error;
    }
  });

  ipcMain.handle('sync:getLogs', async () => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        return [];
      }
      return await syncManager.getRecentSyncLogs(50);
    } catch (error) {
      console.error('Error getting sync logs:', error);
      return [];
    }
  });

  ipcMain.handle('sync:getServerStats', async () => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        return {
          connectedMachines: 0,
          totalDocuments: 0,
          lastActivity: null
        };
      }
      // This would need to be implemented in sync-manager or fetched from server
      return {
        connectedMachines: 1, // Mock data for now
        totalDocuments: 0,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting server stats:', error);
      return {
        connectedMachines: 0,
        totalDocuments: 0,
        lastActivity: null
      };
    }
  });

  ipcMain.handle('sync:getConnectedMachines', async () => {
    try {
      const syncManager = db.getSyncManager();
      if (!syncManager) {
        return [];
      }
      // This would typically fetch from the sync server
      // For now, return mock data or implement server endpoint
      return [
        {
          id: db.getMachineId(),
          lastSeen: new Date().toISOString(),
          status: 'online'
        }
      ];
    } catch (error) {
      console.error('Error getting connected machines:', error);
      return [];
    }
  });

  // Seeder handler for development purposes
  ipcMain.handle('db:seedDatabase', async (event, options) => {
    try {
      return await seedDatabase(options);
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  });

  // Product handlers
  ipcMain.handle('db:getProducts', async () => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const docs = await rxDatabase.products.find().exec();
          return docs.map(doc => doc.toJSON());
        },
        nedb: async () => {
          return await promisify(db.products.find.bind(db.products), {});
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  });

  // Update product stock after transaction
  ipcMain.handle('db:updateProductStock', async (event, stockUpdates) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const results = [];
          
          for (const update of stockUpdates) {
            const product = await rxDatabase.products.findOne(update.productId).exec();
            
            if (!product) {
              throw new Error(`Product not found: ${update.productId}`);
            }
            
            const oldStock = product.stock;
            const newStock = Math.max(0, oldStock - update.quantity);
            
            await product.update({
              $set: {
                stock: newStock,
                updatedAt: new Date().toISOString(),
                lastModified: Date.now()
              }
            });
            
            results.push({
              productId: update.productId,
              oldStock,
              newStock,
              result: { numAffected: 1 }
            });
          }
          
          return { success: true, results };
        },
        nedb: async () => {
          const results = [];
          
          for (const update of stockUpdates) {
            const product = await promisify(
              db.products.findOne.bind(db.products), 
              { _id: update.productId }
            );
            
            if (!product) {
              throw new Error(`Product not found: ${update.productId}`);
            }
            
            const newStock = Math.max(0, product.stock - update.quantity);
            
            const result = await promisify(
              db.products.update.bind(db.products),
              { _id: update.productId },
              { $set: { stock: newStock } },
              {}
            );
            
            results.push({
              productId: update.productId,
              oldStock: product.stock,
              newStock: newStock,
              result: result
            });
          }
          
          return { success: true, results };
        }
      });
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getProduct', async (event, id) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const doc = await rxDatabase.products.findOne(id).exec();
          return doc ? doc.toJSON() : null;
        },
        nedb: async () => {
          return await promisify(db.products.findOne.bind(db.products), { _id: id });
        }
      });
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:addProduct', async (event, product) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          // Remove empty barcode fields to avoid unique constraint issues
          if (product.barcode === '' || product.barcode === null || product.barcode === undefined) {
            delete product.barcode;
          }
          
          const productWithDefaults = db.addDefaultFields(product);
          const doc = await rxDatabase.products.insert(productWithDefaults);
          return doc.toJSON();
        },
        nedb: async () => {
          // Remove empty barcode fields to avoid unique constraint issues
          if (product.barcode === '' || product.barcode === null || product.barcode === undefined) {
            delete product.barcode;
          }
          return await promisify(db.products.insert.bind(db.products), product);
        }
      });
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  });

  ipcMain.handle('db:updateProduct', async (event, id, product) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          // Remove empty barcode fields to avoid unique constraint issues
          if (product.barcode === '' || product.barcode === null || product.barcode === undefined) {
            delete product.barcode;
          }
          
          const doc = await rxDatabase.products.findOne(id).exec();
          if (!doc) {
            throw new Error(`Product not found: ${id}`);
          }
          
          const updateData = db.updateWithTracking(product);
          await doc.update({ $set: updateData });
          return { numAffected: 1 };
        },
        nedb: async () => {
          // Remove empty barcode fields to avoid unique constraint issues
          if (product.barcode === '' || product.barcode === null || product.barcode === undefined) {
            delete product.barcode;
          }
          return await promisify(
            db.products.update.bind(db.products),
            { _id: id },
            { $set: product },
            {}
          );
        }
      });
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteProduct', async (event, id) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const doc = await rxDatabase.products.findOne(id).exec();
          if (!doc) {
            throw new Error(`Product not found: ${id}`);
          }
          await doc.remove();
          return { numRemoved: 1 };
        },
        nedb: async () => {
          return await promisify(
            db.products.remove.bind(db.products),
            { _id: id },
            {}
          );
        }
      });
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  });

  // Category handlers
  ipcMain.handle('db:getCategories', async () => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const docs = await rxDatabase.categories.find().exec();
          return docs.map(doc => doc.toJSON());
        },
        nedb: async () => {
          return await promisify(db.categories.find.bind(db.categories), {});
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  });

  ipcMain.handle('db:addCategory', async (event, category) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const categoryWithDefaults = db.addDefaultFields({
            ...category,
            isActive: category.isActive !== undefined ? category.isActive : true
          });
          const doc = await rxDatabase.categories.insert(categoryWithDefaults);
          return doc.toJSON();
        },
        nedb: async () => {
          return await promisify(db.categories.insert.bind(db.categories), category);
        }
      });
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  });

  ipcMain.handle('db:updateCategory', async (event, id, category) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const doc = await rxDatabase.categories.findOne(id).exec();
          if (!doc) {
            throw new Error(`Category not found: ${id}`);
          }
          
          const updateData = db.updateWithTracking(category);
          await doc.update({ $set: updateData });
          return { numAffected: 1 };
        },
        nedb: async () => {
          return await promisify(
            db.categories.update.bind(db.categories),
            { _id: id },
            { $set: category },
            {}
          );
        }
      });
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteCategory', async (event, id) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const doc = await rxDatabase.categories.findOne(id).exec();
          if (!doc) {
            throw new Error(`Category not found: ${id}`);
          }
          await doc.remove();
          return { numRemoved: 1 };
        },
        nedb: async () => {
          return await promisify(
            db.categories.remove.bind(db.categories),
            { _id: id },
            {}
          );
        }
      });
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  });

  // Transaction handlers
  ipcMain.handle('tx:create', async (event, transaction) => {
    try {
      return await executeDbOperation({
        rxdb: async (rxDatabase) => {
          const transactionWithDefaults = db.addDefaultFields({
            ...transaction,
            refunded: false,
            date: new Date().toISOString()
          });
          const doc = await rxDatabase.transactions.insert(transactionWithDefaults);
          return doc.toJSON();
        },
        nedb: async () => {
          return await promisify(db.transactions.insert.bind(db.transactions), {
            ...transaction,
            refunded: false,
            date: new Date().toISOString()
          });
        }
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  });

  ipcMain.handle('tx:getAll', async () => {
    try {
      return await promisify(db.transactions.find.bind(db.transactions), {});
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  });

  ipcMain.handle('tx:getById', async (event, id) => {
    try {
      return await promisify(db.transactions.findOne.bind(db.transactions), { _id: id });
    } catch (error) {
      console.error(`Error fetching transaction ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('tx:getByReceiptId', async (event, receiptId) => {
    try {
      return await promisify(db.transactions.findOne.bind(db.transactions), { receiptId: receiptId });
    } catch (error) {
      console.error(`Error fetching transaction with receipt ID ${receiptId}:`, error);
      throw error;
    }
  });

  ipcMain.handle('tx:processRefund', async (event, refundData) => {
    try {
      // Start a transaction-like operation (NeDB doesn't support true transactions)
      // 1. Mark the original transaction as refunded
      const originalTransaction = await promisify(
        db.transactions.findOne.bind(db.transactions),
        { _id: refundData.originalTransactionId }
      );

      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      if (originalTransaction.refunded) {
        throw new Error('This transaction has already been refunded');
      }

      // Update the original transaction to mark it as refunded
      await promisify(
        db.transactions.update.bind(db.transactions),
        { _id: refundData.originalTransactionId },
        { $set: { 
          refunded: true,
          refundReason: refundData.refundReason,
          refundDate: refundData.refundDate
        }},
        {}
      );

      // 2. Create a refund transaction record
      const refundTransaction = {
        type: 'refund',
        originalTransactionId: refundData.originalTransactionId,
        receiptId: `RF-${refundData.receiptId}`,
        date: refundData.refundDate,
        items: refundData.items,
        subtotal: refundData.refundAmount,
        tax: 0, // Tax is already included in the refund amount
        total: refundData.refundAmount,
        paymentMethod: refundData.paymentMethod,
        refundReason: refundData.refundReason
      };

      await promisify(db.transactions.insert.bind(db.transactions), refundTransaction);

      // 3. Update inventory for returned items
      for (const item of refundData.items) {
        if (refundData.returnToStock[item._id]) {
          // Find the product in the database
          const product = await promisify(
            db.products.findOne.bind(db.products),
            { _id: item._id }
          );

          if (product) {
            // Increase the stock quantity
            await promisify(
              db.products.update.bind(db.products),
              { _id: item._id },
              { $set: { stock: product.stock + item.quantity } },
              {}
            );
          }
        }
      }

      return { success: true, message: 'Refund processed successfully' };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, message: error.message };
    }
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    try {
      return await promisify(db.settings.findOne.bind(db.settings), { _id: 'app-settings' });
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (event, settings) => {
    try {
      return await promisify(
        db.settings.update.bind(db.settings),
        { _id: 'app-settings' },
        { $set: { ...settings, _id: 'app-settings' } },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  });

  // Auth handlers
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      const user = await promisify(db.users.findOne.bind(db.users), { username });
      if (!user) throw new Error('User not found');
      if (user.password !== password) throw new Error('Invalid password'); // Replace with proper hashing
      
      // Check if user is active
      if (user.active === false) {
        throw new Error('Account is inactive. Please contact an administrator.');
      }
      
      return { 
        success: true, 
        user: {
          username: user.username,
          role: user.role,
          permissions: user.permissions || [],
          fullName: user.fullName,
        } 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    return { success: true };
  });
  
  // Added new handlers for the setup process
  ipcMain.handle('auth:getUsers', async () => {
    try {
      return await promisify(db.users.find.bind(db.users), {});
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  });
  
  ipcMain.handle('auth:createAdmin', async (event, userData) => {
    try {
      // First check if admin already exists
      const existingAdmin = await promisify(
        db.users.findOne.bind(db.users), 
        { role: 'admin' }
      );
      
      if (existingAdmin) {
        throw new Error('Admin user already exists');
      }
      
      // Create the admin user with full permissions
      const adminUser = {
        ...userData,
        role: 'admin',
        permissions: [
          'dashboard', 'pos', 'products', 'categories', 
          'transactions', 'settings', 'stock', 'reports', 'staff'
        ],
        active: true,
        createdAt: new Date()
      };
      
      return await promisify(db.users.insert.bind(db.users), adminUser);
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  });

  // Initialize defaults for a new setup
  ipcMain.handle('db:initializeDefaults', async () => {
    try {
      // Create default categories if none exist
      const categories = await promisify(db.categories.find.bind(db.categories), {});
      
      if (categories.length === 0) {
        const defaultCategories = [
          { name: 'Food', color: '#4CAF50' },
          { name: 'Beverages', color: '#2196F3' },
          { name: 'Snacks', color: '#FF9800' },
          { name: 'Household', color: '#9C27B0' }
        ];
        
        for (const category of defaultCategories) {
          await promisify(db.categories.insert.bind(db.categories), category);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing defaults:', error);
      throw error;
    }
  });

  // Reports handlers
  ipcMain.handle('db:getSalesByTimeFrame', async (event, timeFrame) => {
    try {
      // Get all transactions
      const transactions = await promisify(db.transactions.find.bind(db.transactions), {});
      
      // Filter transactions based on time frame
      const now = new Date();
      let startDate;
      
      switch (timeFrame) {
        case 'day':
          // Today (from 00:00:00)
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          // This week (from Sunday)
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          startDate = new Date(now);
          startDate.setDate(now.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          // This month (from 1st)
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          // This year (from Jan 1st)
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0); // All time if invalid timeframe
          break;
      }
      
      // Filter transactions by date
      const filteredTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt || tx.date);
        return txDate >= startDate && txDate <= now;
      });
      
      return filteredTransactions;
    } catch (error) {
      console.error(`Error fetching sales by time frame (${timeFrame}):`, error);
      throw error;
    }
  });

  ipcMain.handle('db:getTopSellingProducts', async (event, timeFrame) => {
    try {
      // First get all transactions
      const transactions = await promisify(db.transactions.find.bind(db.transactions), {});
      
      // Filter transactions based on time frame
      const now = new Date();
      let startDate;
      
      switch (timeFrame) {
        case 'day':
          // Today (from 00:00:00)
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          // This week (from Sunday)
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          startDate = new Date(now);
          startDate.setDate(now.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          // This month (from 1st)
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          // This year (from Jan 1st)
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0); // All time if invalid timeframe
          break;
      }
      
      // Filter transactions by date
      const sales = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt || tx.date);
        return txDate >= startDate && txDate <= now;
      });
      
      // Extract all items from all sales
      const allItems = sales.flatMap(sale => sale.items || []);
      
      // Create a map to track product sales
      const productMap = {};
      
      // Aggregate sales data by product
      for (const item of allItems) {
        const productId = item.productId;
        
        if (!productMap[productId]) {
          productMap[productId] = {
            productId,
            name: item.name,
            salesCount: 0,
            revenue: 0
          };
        }
        
        productMap[productId].salesCount += item.quantity;
        productMap[productId].revenue += item.total || (item.price * item.quantity);
      }
      
      // Convert to array and sort by sales count in descending order
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.salesCount - a.salesCount || b.revenue - a.revenue);
      
      return topProducts;
    } catch (error) {
      console.error(`Error fetching top selling products (${timeFrame}):`, error);
      throw error;
    }
  });

  ipcMain.handle('db:getSalesByDateRange', async (event, startDate, endDate) => {
    try {
      // Get all transactions
      const transactions = await promisify(db.transactions.find.bind(db.transactions), {});
      
      // Convert string dates to Date objects
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Filter transactions by date range
      const filteredTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt || tx.date);
        return txDate >= start && txDate <= end;
      });
      
      return filteredTransactions;
    } catch (error) {
      console.error(`Error fetching sales by date range (${startDate} to ${endDate}):`, error);
      throw error;
    }
  });

  ipcMain.handle('db:getProductsStockReport', async (event, filter) => {
    try {
      // Get all products and settings
      const products = await promisify(db.products.find.bind(db.products), {});
      const settings = await promisify(db.settings.findOne.bind(db.settings), { _id: 'app-settings' });
      const lowStockThreshold = settings?.lowStockThreshold || 5;
      
      // Apply filters if specified
      let filteredProducts = [...products];
      
      if (filter === 'low') {
        filteredProducts = products.filter(p => p.stock > 0 && p.stock <= lowStockThreshold);
      } else if (filter === 'out') {
        filteredProducts = products.filter(p => p.stock <= 0);
      } else if (filter === 'healthy') {
        filteredProducts = products.filter(p => p.stock > lowStockThreshold);
      }
      
      // Calculate total stock value for each product
      const productsWithValue = filteredProducts.map(product => ({
        ...product,
        stockValue: product.stock * product.costPrice
      }));
      
      return productsWithValue;
    } catch (error) {
      console.error(`Error fetching products stock report:`, error);
      throw error;
    }
  });

  // Database export/import handlers
  ipcMain.handle('db:export', async (event) => {
    try {
      // Get the save file path from user
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Database',
        defaultPath: path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', 'pos-export.json'),
        buttonLabel: 'Export',
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ]
      });

      if (canceled) {
        return { success: false, message: 'Export cancelled' };
      }

      // Get all data from all collections
      const productsData = await promisify(db.products.find.bind(db.products), {});
      const categoriesData = await promisify(db.categories.find.bind(db.categories), {});
      const transactionsData = await promisify(db.transactions.find.bind(db.transactions), {});
      const settingsData = await promisify(db.settings.find.bind(db.settings), {});
      const usersData = await promisify(db.users.find.bind(db.users), {});

      // Create export object
      const exportData = {
        metadata: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          collections: ['products', 'categories', 'transactions', 'settings', 'users']
        },
        products: productsData,
        categories: categoriesData,
        transactions: transactionsData,
        settings: settingsData,
        users: usersData
      };

      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

      return { success: true, message: 'Database exported successfully', path: filePath };
    } catch (error) {
      console.error('Error exporting database:', error);
      return { success: false, message: `Export failed: ${error.message}` };
    }
  });

  ipcMain.handle('db:import', async (event) => {
    try {
      // Get the file path from user
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Database',
        buttonLabel: 'Import',
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, message: 'Import cancelled' };
      }

      // Read the file
      const fileData = fs.readFileSync(filePaths[0], 'utf8');
      const importData = JSON.parse(fileData);

      // Validate the import data
      if (!importData.metadata || !importData.metadata.version) {
        return { success: false, message: 'Invalid import file format' };
      }

      // Clear existing collections
      await promisify(db.products.remove.bind(db.products), {}, { multi: true });
      await promisify(db.categories.remove.bind(db.categories), {}, { multi: true });
      await promisify(db.transactions.remove.bind(db.transactions), {}, { multi: true });
      await promisify(db.settings.remove.bind(db.settings), {}, { multi: true });
      await promisify(db.users.remove.bind(db.users), {}, { multi: true });

      // Import data into collections
      if (importData.products && importData.products.length > 0) {
        for (const product of importData.products) {
          await promisify(db.products.insert.bind(db.products), product);
        }
      }

      if (importData.categories && importData.categories.length > 0) {
        for (const category of importData.categories) {
          await promisify(db.categories.insert.bind(db.categories), category);
        }
      }

      if (importData.transactions && importData.transactions.length > 0) {
        for (const transaction of importData.transactions) {
          await promisify(db.transactions.insert.bind(db.transactions), transaction);
        }
      }

      if (importData.settings && importData.settings.length > 0) {
        for (const setting of importData.settings) {
          await promisify(db.settings.insert.bind(db.settings), setting);
        }
      }

      if (importData.users && importData.users.length > 0) {
        for (const user of importData.users) {
          await promisify(db.users.insert.bind(db.users), user);
        }
      }

      return { success: true, message: 'Database imported successfully' };
    } catch (error) {
      console.error('Error importing database:', error);
      return { success: false, message: `Import failed: ${error.message}` };
    }
  });

  // Reset database handler
  ipcMain.handle('db:reset', async () => {
    try {
      // Clear all collections
      await promisify(db.products.remove.bind(db.products), {}, { multi: true });
      await promisify(db.categories.remove.bind(db.categories), {}, { multi: true });
      await promisify(db.transactions.remove.bind(db.transactions), {}, { multi: true });
      await promisify(db.settings.remove.bind(db.settings), {}, { multi: true });
      await promisify(db.users.remove.bind(db.users), {}, { multi: true });

      // Compact databases to reclaim space
      await promisify(db.products.compactDatafile.bind(db.products));
      await promisify(db.categories.compactDatafile.bind(db.categories));
      await promisify(db.transactions.compactDatafile.bind(db.transactions));
      await promisify(db.settings.compactDatafile.bind(db.settings));
      await promisify(db.users.compactDatafile.bind(db.users));

      // Do NOT re-initialize default settings or users
      // This will force the setup wizard to appear on next launch
      
      return { success: true, message: 'All data has been reset. Restart the application to begin setup.' };
    } catch (error) {
      console.error('Error resetting database:', error);
      return { success: false, message: `Reset failed: ${error.message}` };
    }
  });

  // Staff management handlers
  ipcMain.handle('staff:getUsers', async (event) => {
    try {
      return await promisify(db.users.find.bind(db.users), {});
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  });

  ipcMain.handle('staff:getUser', async (event, id) => {
    try {
      const user = await promisify(db.users.findOne.bind(db.users), { _id: id });
      if (!user) throw new Error('User not found');
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  });

  ipcMain.handle('staff:addUser', async (event, userData) => {
    try {
      // Check if username already exists
      const existingUser = await promisify(db.users.findOne.bind(db.users), { username: userData.username });
      if (existingUser) throw new Error('Username already exists');
      
      // Add creation date
      const newUser = {
        ...userData,
        createdAt: new Date(),
        active: userData.active !== false // Default to active if not specified
      };
      
      // Remove confirmPassword if it exists
      if (newUser.confirmPassword) delete newUser.confirmPassword;
      
      const insertedUser = await promisify(db.users.insert.bind(db.users), newUser);
      
      // Don't return the password
      const { password, ...userWithoutPassword } = insertedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error adding user:', error);
      throw new Error(error.message || 'Failed to add user');
    }
  });

  ipcMain.handle('staff:updateUser', async (event, id, userData) => {
    try {
      // Find the user first
      const existingUser = await promisify(db.users.findOne.bind(db.users), { _id: id });
      if (!existingUser) throw new Error('User not found');
      
      // If no password provided, keep the existing one
      if (!userData.password) {
        userData.password = existingUser.password;
      }
      
      // Remove confirmPassword if it exists
      if (userData.confirmPassword) delete userData.confirmPassword;
      
      // Add update date
      userData.updatedAt = new Date();
      
      await promisify(db.users.update.bind(db.users), { _id: id }, { $set: userData });
      
      // Get the updated user
      const updatedUser = await promisify(db.users.findOne.bind(db.users), { _id: id });
      
      // Don't return the password
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message || 'Failed to update user');
    }
  });

  ipcMain.handle('staff:deleteUser', async (event, id) => {
    try {
      // Don't allow deleting the last admin
      const adminUsers = await promisify(db.users.find.bind(db.users), { role: 'admin' });
      const userToDelete = await promisify(db.users.findOne.bind(db.users), { _id: id });
      
      if (userToDelete && userToDelete.role === 'admin' && adminUsers.length <= 1) {
        throw new Error('Cannot delete the last administrator account');
      }
      
      const numRemoved = await promisify(db.users.remove.bind(db.users), { _id: id }, {});
      if (numRemoved === 0) throw new Error('User not found');
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  });
};

module.exports = {
  setupDbHandlers
};