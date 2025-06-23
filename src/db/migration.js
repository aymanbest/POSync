const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron');
const { getDatabase, addDefaultFields, getMachineId } = require('./rxdb-setup');

class DatabaseMigration {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.nedbFiles = {
      products: path.join(this.userDataPath, 'products.db'),
      categories: path.join(this.userDataPath, 'categories.db'),
      transactions: path.join(this.userDataPath, 'transactions.db'),
      users: path.join(this.userDataPath, 'users.db'),
      settings: path.join(this.userDataPath, 'settings.db')
    };
  }
  // Check if NeDB files exist
  hasNedbData() {
    const fs = require('fs');
    return Object.values(this.nedbFiles).some(filePath => fs.existsSync(filePath));
  }

  // Migrate data from NeDB to RxDB
  async migrateFromNedb() {
    if (!this.hasNedbData()) {
      console.log('No NeDB data found to migrate');
      return { success: true, message: 'No data to migrate' };
    }

    console.log('Starting migration from NeDB to RxDB...');
    
    try {
      const rxdb = await getDatabase();
      const machineId = getMachineId();
      let totalMigrated = 0;

      // Migrate each collection
      for (const [collectionName, filePath] of Object.entries(this.nedbFiles)) {
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
          console.log(`Skipping ${collectionName} - file not found`);
          continue;
        }

        console.log(`Migrating ${collectionName}...`);
        
        try {
          // Load NeDB data with retry logic
          const nedbData = await this.loadNedbDataWithRetry(filePath, 3);
          
          if (nedbData.length === 0) {
            console.log(`No data found in ${collectionName}`);
            continue;
          }

          // Transform and insert data
          const collection = rxdb[collectionName];
          const transformedDocs = [];

          for (const doc of nedbData) {
            try {
              const transformedDoc = this.transformDocument(doc, machineId);
              transformedDocs.push(transformedDoc);
            } catch (transformError) {
              console.warn(`Failed to transform document in ${collectionName}:`, transformError.message);
            }
          }

          // Insert documents in batches
          const batchSize = 50;
          for (let i = 0; i < transformedDocs.length; i += batchSize) {
            const batch = transformedDocs.slice(i, i + batchSize);
            try {
              await collection.bulkInsert(batch);
              totalMigrated += batch.length;
            } catch (insertError) {
              console.warn(`Failed to insert batch in ${collectionName}:`, insertError.message);
              // Try inserting individually
              for (const doc of batch) {
                try {
                  await collection.insert(doc);
                  totalMigrated++;
                } catch (individualError) {
                  console.warn(`Failed to insert individual document:`, individualError.message);
                }
              }
            }
          }          console.log(`Successfully migrated ${transformedDocs.length} documents from ${collectionName}`);
        } catch (collectionError) {
          console.error(`Failed to migrate ${collectionName}:`, collectionError.message);
          // Continue with other collections instead of failing completely
        }
      }

      console.log(`Migration completed. Total documents migrated: ${totalMigrated}`);
      
      // Optionally backup NeDB files (don't fail migration if backup fails)
      try {
        await this.backupNedbFiles();
      } catch (backupError) {
        console.warn('Backup failed but migration was successful:', backupError.message);
      }

      return {
        success: totalMigrated > 0,
        message: `Successfully migrated ${totalMigrated} documents`,
        totalMigrated
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        error
      };
    }
  }
  // Load NeDB data with retry logic
  async loadNedbDataWithRetry(filePath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Loading ${filePath} (attempt ${attempt}/${maxRetries})`);
        return await this.loadNedbData(filePath);
      } catch (error) {
        console.warn(`Attempt ${attempt} failed for ${filePath}:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Load data from NeDB file
  async loadNedbData(filePath) {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        resolve([]);
        return;
      }

      // Close any existing database connections that might lock the file
      if (global.gc) {
        global.gc(); // Force garbage collection if available
      }

      // Wait a bit to ensure file is not locked
      setTimeout(() => {
        try {
          // Create a temporary copy to avoid file lock issues
          const tempPath = filePath + '.migration_temp';
          
          try {
            fs.copyFileSync(filePath, tempPath);
          } catch (copyError) {
            console.warn(`Could not create temp copy of ${filePath}, reading directly:`, copyError.message);
            // Fall back to reading the original file directly
          }

          const readPath = fs.existsSync(tempPath) ? tempPath : filePath;
          const db = new Datastore({ filename: readPath, autoload: false });
          
          db.loadDatabase((err) => {
            if (err) {
              // Clean up temp file if it exists
              if (fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch (e) {}
              }
              reject(err);
              return;
            }
            
            db.find({}, (err, docs) => {
              // Clean up temp file if it exists
              if (fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch (e) {}
              }
              
              if (err) {
                reject(err);
              } else {
                resolve(docs);
              }
            });
          });
        } catch (error) {
          reject(error);
        }
      }, 100); // Wait 100ms to ensure any file locks are released
    });
  }

  // Transform NeDB document to RxDB format
  transformDocument(doc, machineId) {
    const now = new Date().toISOString();
    const timestamp = Date.now();

    // Remove NeDB specific fields
    const { _id: originalId, ...docWithoutId } = doc;

    // Create new document with required fields
    const transformed = {
      _id: originalId || `migrated-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      ...docWithoutId,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now,
      lastModified: timestamp,
      machineId: machineId
    };

    // Handle specific field transformations
    
    // Ensure boolean fields are properly set
    if (transformed.hasOwnProperty('isActive') && typeof transformed.isActive !== 'boolean') {
      transformed.isActive = Boolean(transformed.isActive);
    }
    
    if (transformed.hasOwnProperty('active') && typeof transformed.active !== 'boolean') {
      transformed.active = Boolean(transformed.active);
    }
    
    if (transformed.hasOwnProperty('refunded') && typeof transformed.refunded !== 'boolean') {
      transformed.refunded = Boolean(transformed.refunded);
    }

    // Ensure numeric fields are numbers
    const numericFields = ['price', 'cost', 'stock', 'stockAlert', 'subtotal', 'tax', 'total', 'paymentAmount', 'change', 'taxRate', 'lowStockThreshold'];
    numericFields.forEach(field => {
      if (transformed.hasOwnProperty(field) && transformed[field] !== null && transformed[field] !== undefined) {
        transformed[field] = Number(transformed[field]) || 0;
      }
    });

    // Handle date fields
    const dateFields = ['date', 'createdAt', 'updatedAt', 'refundedAt', 'lastSyncAt'];
    dateFields.forEach(field => {
      if (transformed[field] && typeof transformed[field] !== 'string') {
        if (transformed[field] instanceof Date) {
          transformed[field] = transformed[field].toISOString();
        } else {
          transformed[field] = new Date(transformed[field]).toISOString();
        }
      }
    });

    // Handle arrays
    if (transformed.permissions && !Array.isArray(transformed.permissions)) {
      transformed.permissions = [];
    }    if (transformed.items && !Array.isArray(transformed.items)) {
      transformed.items = [];
    }

    // Handle payment methods object
    if (transformed.paymentMethods && typeof transformed.paymentMethods !== 'object') {
      transformed.paymentMethods = { cash: true, card: true };
    }

    return transformed;
  }

  // Backup NeDB files before migration
  async backupNedbFiles() {
    const fs = require('fs');
    const fsPromises = require('fs').promises;
    const backupDir = path.join(this.userDataPath, 'nedb-backup');
    
    try {
      // Create backup directory
      await fsPromises.mkdir(backupDir, { recursive: true });

      // Copy each NeDB file to backup
      for (const [name, filePath] of Object.entries(this.nedbFiles)) {
        if (fs.existsSync(filePath)) {
          try {
            const backupPath = path.join(backupDir, `${name}.db`);
            await fsPromises.copyFile(filePath, backupPath);
            console.log(`Backed up ${name} to ${backupPath}`);
          } catch (copyError) {
            console.warn(`Failed to backup ${name}:`, copyError.message);
            // Continue with other files even if one fails
          }
        } else {
          console.log(`Skipping backup of ${name} - file does not exist`);
        }
      }

      console.log('NeDB files backup process completed');
    } catch (error) {
      console.error('Failed to backup NeDB files:', error);
      // Don't throw the error, just log it - backup failure shouldn't stop migration
    }
  }

  // Export RxDB data (for backup or transfer purposes)
  async exportRxdbData() {
    try {
      const rxdb = await getDatabase();
      const exportData = {};

      for (const collectionName of ['products', 'categories', 'transactions', 'users', 'settings']) {
        const collection = rxdb[collectionName];
        if (collection) {
          const docs = await collection.find().exec();
          exportData[collectionName] = docs.map(doc => doc.toJSON());
        }
      }

      return {
        success: true,
        data: exportData,
        exportedAt: new Date().toISOString(),
        machineId: getMachineId()
      };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Import RxDB data (for restore purposes)
  async importRxdbData(importData, options = {}) {
    const { clearExisting = false, skipConflicts = true } = options;

    try {
      const rxdb = await getDatabase();
      let totalImported = 0;

      for (const [collectionName, docs] of Object.entries(importData.data || importData)) {
        const collection = rxdb[collectionName];
        if (!collection || !Array.isArray(docs)) {
          continue;
        }

        if (clearExisting) {
          // Remove all existing documents
          const existingDocs = await collection.find().exec();
          for (const doc of existingDocs) {
            await doc.remove();
          }
          console.log(`Cleared ${existingDocs.length} existing documents from ${collectionName}`);
        }

        // Import documents
        const importedDocs = [];
        for (const docData of docs) {
          try {
            if (skipConflicts) {
              const existing = await collection.findOne(docData._id).exec();
              if (existing) {
                console.log(`Skipping existing document ${docData._id} in ${collectionName}`);
                continue;
              }
            }

            await collection.insert(docData);
            importedDocs.push(docData);
          } catch (error) {
            if (skipConflicts) {
              console.log(`Skipping document ${docData._id} due to conflict: ${error.message}`);
            } else {
              throw error;
            }
          }
        }

        console.log(`Imported ${importedDocs.length} documents to ${collectionName}`);
        totalImported += importedDocs.length;
      }

      return {
        success: true,
        message: `Successfully imported ${totalImported} documents`,
        totalImported
      };
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DatabaseMigration;
