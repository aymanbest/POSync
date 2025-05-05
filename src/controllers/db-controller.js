const db = require('../db');
const { ipcMain } = require('electron');

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
};

module.exports = {
  setupDbHandlers
}; 