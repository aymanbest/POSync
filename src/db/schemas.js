// RxDB Schemas for POS System

// Product Schema
const productSchema = {
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 255
    },
    description: {
      type: 'string',
      maxLength: 1000
    },
    price: {
      type: 'number',
      minimum: 0
    },
    cost: {
      type: 'number',
      minimum: 0
    },
    categoryId: {
      type: 'string',
      maxLength: 100
    },
    barcode: {
      type: 'string',
      maxLength: 50
    },
    stock: {
      type: 'number',
      minimum: 0
    },
    stockAlert: {
      type: 'number',
      minimum: 0
    },
    image: {
      type: 'string'
    },
    isActive: {
      type: 'boolean'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    },
    lastModified: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    },
    machineId: {
      type: 'string',
      maxLength: 100
    }
  },
  required: ['_id', 'name', 'price', 'stock', 'isActive', 'createdAt', 'lastModified', 'machineId'],
  indexes: ['barcode', 'categoryId', 'lastModified']
};

// Category Schema
const categorySchema = {
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 255
    },
    description: {
      type: 'string',
      maxLength: 1000
    },
    isActive: {
      type: 'boolean'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    },
    lastModified: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    },
    machineId: {
      type: 'string',
      maxLength: 100
    }
  },
  required: ['_id', 'name', 'isActive', 'createdAt', 'lastModified', 'machineId'],
  indexes: ['name', 'lastModified']
};

// Transaction Schema
const transactionSchema = {
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      maxLength: 100
    },
    receiptId: {
      type: 'string',
      maxLength: 100
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            maxLength: 100
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          price: {
            type: 'number',
            minimum: 0
          },
          quantity: {
            type: 'number',
            minimum: 1
          },
          subtotal: {
            type: 'number',
            minimum: 0
          },
          barcode: {
            type: 'string',
            maxLength: 50
          }
        },
        required: ['productId', 'name', 'price', 'quantity', 'subtotal']
      }
    },
    total: {
      type: 'number',
      minimum: 0
    },
    tax: {
      type: 'number',
      minimum: 0
    },
    discount: {
      type: 'number',
      minimum: 0
    },
    paymentMethod: {
      type: 'string',
      enum: ['cash', 'card', 'mobile']
    },
    cashReceived: {
      type: 'number',
      minimum: 0
    },
    change: {
      type: 'number',
      minimum: 0
    },    date: {
      type: 'string',
      format: 'date-time',
      maxLength: 50
    },
    refunded: {
      type: 'boolean'
    },
    refundReason: {
      type: 'string',
      maxLength: 255
    },
    lastModified: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    },
    machineId: {
      type: 'string',
      maxLength: 100
    }
  },
  required: ['_id', 'receiptId', 'items', 'total', 'paymentMethod', 'date', 'refunded', 'lastModified', 'machineId'],
  indexes: ['receiptId', 'date', 'lastModified', 'refunded']
};

// User Schema
const userSchema = {
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      maxLength: 100
    },
    username: {
      type: 'string',
      maxLength: 100
    },
    password: {
      type: 'string',
      maxLength: 255
    },
    firstName: {
      type: 'string',
      maxLength: 100
    },
    lastName: {
      type: 'string',
      maxLength: 100
    },
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255
    },
    role: {
      type: 'string',
      enum: ['admin', 'cashier', 'manager']
    },
    active: {
      type: 'boolean'
    },
    permissions: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    },
    lastModified: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    },
    machineId: {
      type: 'string',
      maxLength: 100
    }
  },
  required: ['_id', 'username', 'password', 'role', 'active', 'createdAt', 'lastModified', 'machineId'],
  indexes: ['username', 'lastModified']
};

// Settings Schema
const settingsSchema = {
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      maxLength: 100
    },
    storeName: {
      type: 'string',
      maxLength: 255
    },
    storeAddress: {
      type: 'string',
      maxLength: 500
    },
    storePhone: {
      type: 'string',
      maxLength: 50
    },
    storeEmail: {
      type: 'string',
      format: 'email',
      maxLength: 255
    },
    currency: {
      type: 'string',
      maxLength: 10
    },
    taxRate: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    receiptMessage: {
      type: 'string',
      maxLength: 500
    },
    lowStockThreshold: {
      type: 'number',
      minimum: 0
    },
    autoBackup: {
      type: 'boolean'
    },
    backupFrequency: {
      type: 'string',
      enum: ['daily', 'weekly', 'monthly']
    },
    syncEnabled: {
      type: 'boolean'
    },
    syncServerUrl: {
      type: 'string',
      maxLength: 255
    },
    syncInterval: {
      type: 'number',
      minimum: 5
    },
    theme: {
      type: 'string',
      enum: ['light', 'dark']
    },
    language: {
      type: 'string',
      maxLength: 10
    },
    printerName: {
      type: 'string',
      maxLength: 255
    },
    receiptWidth: {
      type: 'number',
      minimum: 20,
      maximum: 100
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    },
    lastModified: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    },
    machineId: {
      type: 'string',
      maxLength: 100
    }
  },
  required: ['_id', 'lastModified', 'machineId'],
  indexes: ['lastModified']
};

// Sync Log Schema (for tracking sync operations)
const syncLogSchema = {
  version: 0,
  primaryKey: '_id',
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      maxLength: 100
    },
    collection: {
      type: 'string',
      maxLength: 50
    },
    operation: {
      type: 'string',
      enum: ['insert', 'update', 'delete', 'sync']
    },
    documentId: {
      type: 'string',
      maxLength: 100
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    },
    machineId: {
      type: 'string',
      maxLength: 100
    },
    success: {
      type: 'boolean'
    },
    error: {
      type: 'string',
      maxLength: 1000
    }
  },
  required: ['_id', 'collection', 'operation', 'timestamp', 'machineId', 'success'],
  indexes: ['collection', 'timestamp', 'machineId']
};

module.exports = {
  productSchema,
  categorySchema,
  transactionSchema,
  userSchema,
  settingsSchema,
  syncLogSchema
};