const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron');

// Get user data path for storing the databases
const userDataPath = app.getPath('userData');

// Define database files
const db = {
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

// Create indexes
db.products.ensureIndex({ fieldName: 'barcode', unique: true });
db.categories.ensureIndex({ fieldName: 'name', unique: true });
db.users.ensureIndex({ fieldName: 'username', unique: true });

// Initialize with default admin user if none exists
db.users.findOne({ role: 'admin' }, (err, adminUser) => {
  if (!adminUser) {
    db.users.insert({
      username: 'admin',
      password: 'admin', // This should be hashed in production
      role: 'admin',
      createdAt: new Date()
    });
  }
});

// Initialize default settings if none exist
db.settings.findOne({ _id: 'app-settings' }, (err, settings) => {
  if (!settings) {
    db.settings.insert({
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
  }
});

module.exports = db; 