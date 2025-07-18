// Preload script runs in isolated context but has access to Node.js and Electron APIs
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Database operations
    database: {
      getProducts: () => ipcRenderer.invoke('db:getProducts'),
      getProduct: (id) => ipcRenderer.invoke('db:getProduct', id),
      addProduct: (product) => ipcRenderer.invoke('db:addProduct', product),
      updateProduct: (id, product) => ipcRenderer.invoke('db:updateProduct', id, product),
      deleteProduct: (id) => ipcRenderer.invoke('db:deleteProduct', id),
      getCategories: () => ipcRenderer.invoke('db:getCategories'),
      addCategory: (category) => ipcRenderer.invoke('db:addCategory', category),
      updateCategory: (id, category) => ipcRenderer.invoke('db:updateCategory', id, category),
      deleteCategory: (id) => ipcRenderer.invoke('db:deleteCategory', id),
      exportDatabase: () => ipcRenderer.invoke('db:export'),
      importDatabase: () => ipcRenderer.invoke('db:import'),
      resetDatabase: () => ipcRenderer.invoke('db:reset'),
      seedDatabase: (options) => ipcRenderer.invoke('db:seedDatabase', options),
      // Report methods
      getSalesByTimeFrame: (timeFrame) => ipcRenderer.invoke('db:getSalesByTimeFrame', timeFrame),
      getTopSellingProducts: (timeFrame) => ipcRenderer.invoke('db:getTopSellingProducts', timeFrame),
      getSalesByDateRange: (startDate, endDate) => ipcRenderer.invoke('db:getSalesByDateRange', startDate, endDate),
      getProductsStockReport: (filter) => ipcRenderer.invoke('db:getProductsStockReport', filter),
      initializeDefaults: () => ipcRenderer.invoke('db:initializeDefaults')
    },
    
    // Product operations
    products: {
      updateStock: (stockUpdates) => ipcRenderer.invoke('db:updateProductStock', stockUpdates)
    },
    
    // Transaction operations
    transactions: {
      createTransaction: (transaction) => ipcRenderer.invoke('tx:create', transaction),
      getTransactions: () => ipcRenderer.invoke('tx:getAll'),
      getTransactionById: (id) => ipcRenderer.invoke('tx:getById', id),
      getTransactionByReceiptId: (receiptId) => ipcRenderer.invoke('tx:getByReceiptId', receiptId),
      processRefund: (refundData) => ipcRenderer.invoke('tx:processRefund', refundData)
    },
    
    // Printing operations
    print: {
      printReceipt: (data) => ipcRenderer.invoke('print:receipt', data),
      generateReceiptSvg: (data) => ipcRenderer.invoke('print:generateReceiptSvg', data)
    },
    
    // Settings operations
    settings: {
      getSettings: () => ipcRenderer.invoke('settings:get'),
      updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings)
    },
    
    // Authentication
    auth: {
      login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
      logout: () => ipcRenderer.invoke('auth:logout'),
      getUsers: () => ipcRenderer.invoke('auth:getUsers'),
      createAdmin: (userData) => ipcRenderer.invoke('auth:createAdmin', userData)
    },
    
    // Staff management
    staff: {
      getUsers: () => ipcRenderer.invoke('staff:getUsers'),
      getUser: (id) => ipcRenderer.invoke('staff:getUser', id),
      addUser: (userData) => ipcRenderer.invoke('staff:addUser', userData),
      updateUser: (id, userData) => ipcRenderer.invoke('staff:updateUser', id, userData),
      deleteUser: (id) => ipcRenderer.invoke('staff:deleteUser', id)
    },
    
    // Window control for custom title bar
    window: {
      minimize: () => ipcRenderer.send('window:minimize'),
      maximize: () => ipcRenderer.send('window:maximize'),
      close: () => ipcRenderer.send('window:close')
    },
      // Environment variables
    env: {
      get: (name, defaultValue) => ipcRenderer.invoke('env:get', name, defaultValue),
      isDevelopmentMode: () => ipcRenderer.invoke('env:isDevelopmentMode')
    },
    
    // Sync operations
    sync: {
      getConfig: () => ipcRenderer.invoke('sync:getConfig'),
      updateConfig: (config) => ipcRenderer.invoke('sync:updateConfig', config),
      getStatus: () => ipcRenderer.invoke('sync:getStatus'),
      start: (config) => ipcRenderer.invoke('sync:start', config),
      stop: () => ipcRenderer.invoke('sync:stop'),
      testConnection: (serverUrl) => ipcRenderer.invoke('sync:testConnection', serverUrl),
      forcePush: (collection) => ipcRenderer.invoke('sync:forcePush', collection),
      forcePull: (collection) => ipcRenderer.invoke('sync:forcePull', collection),
      getLogs: () => ipcRenderer.invoke('sync:getLogs'),
      getServerStats: () => ipcRenderer.invoke('sync:getServerStats'),
      getConnectedMachines: () => ipcRenderer.invoke('sync:getConnectedMachines')
    }
  }
);