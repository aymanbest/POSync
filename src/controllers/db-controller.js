const db = require('../db');
const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

// Helper to convert callbacks to promises
const promisify = (dbMethod, ...args) => {
  return new Promise((resolve, reject) => {
    dbMethod(...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Set up IPC handlers for database operations
const setupDbHandlers = () => {
  // Product handlers
  ipcMain.handle('db:getProducts', async () => {
    try {
      return await promisify(db.products.find.bind(db.products), {});
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getProduct', async (event, id) => {
    try {
      return await promisify(db.products.findOne.bind(db.products), { _id: id });
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:addProduct', async (event, product) => {
    try {
      return await promisify(db.products.insert.bind(db.products), product);
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  });

  ipcMain.handle('db:updateProduct', async (event, id, product) => {
    try {
      return await promisify(
        db.products.update.bind(db.products),
        { _id: id },
        { $set: product },
        {}
      );
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteProduct', async (event, id) => {
    try {
      return await promisify(
        db.products.remove.bind(db.products),
        { _id: id },
        {}
      );
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  });

  // Category handlers
  ipcMain.handle('db:getCategories', async () => {
    try {
      return await promisify(db.categories.find.bind(db.categories), {});
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  });

  ipcMain.handle('db:addCategory', async (event, category) => {
    try {
      return await promisify(db.categories.insert.bind(db.categories), category);
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  });

  ipcMain.handle('db:updateCategory', async (event, id, category) => {
    try {
      return await promisify(
        db.categories.update.bind(db.categories),
        { _id: id },
        { $set: category },
        {}
      );
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteCategory', async (event, id) => {
    try {
      return await promisify(
        db.categories.remove.bind(db.categories),
        { _id: id },
        {}
      );
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  });

  // Transaction handlers
  ipcMain.handle('tx:create', async (event, transaction) => {
    try {
      return await promisify(db.transactions.insert.bind(db.transactions), transaction);
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
        { $set: settings },
        {}
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
      return { 
        success: true, 
        user: { 
          username: user.username, 
          role: user.role 
        } 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
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

      // Re-initialize default settings
      await promisify(db.settings.insert.bind(db.settings), {
        _id: 'app-settings',
        businessName: 'My POS Store',
        address: '123 Main St',
        phone: '555-123-4567',
        email: 'info@myposstore.com',
        currency: 'USD',
        taxRate: 7.5,
        receiptFooter: 'Thank you for your business!',
        createdAt: new Date()
      });

      // Re-initialize default admin user
      await promisify(db.users.insert.bind(db.users), {
        username: 'admin',
        password: 'admin', // In production this should be hashed
        role: 'admin',
        createdAt: new Date()
      });

      return { success: true, message: 'All data has been reset to factory defaults' };
    } catch (error) {
      console.error('Error resetting database:', error);
      return { success: false, message: `Reset failed: ${error.message}` };
    }
  });
};

module.exports = {
  setupDbHandlers
}; 