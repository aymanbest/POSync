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
      resetDatabase: () => ipcRenderer.invoke('db:reset')
    },
    
    // Transaction operations
    transactions: {
      createTransaction: (transaction) => ipcRenderer.invoke('tx:create', transaction),
      getTransactions: () => ipcRenderer.invoke('tx:getAll'),
      getTransactionById: (id) => ipcRenderer.invoke('tx:getById', id)
    },
    
    // Printing operations
    print: {
      printReceipt: (data) => ipcRenderer.invoke('print:receipt', data)
    },
    
    // Settings operations
    settings: {
      getSettings: () => ipcRenderer.invoke('settings:get'),
      updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings)
    },
    
    // Authentication
    auth: {
      login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
      logout: () => ipcRenderer.invoke('auth:logout')
    }
  }
); 