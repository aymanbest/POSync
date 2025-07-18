const { app, BrowserWindow, ipcMain, session, screen } = require('electron');
const path = require('path');
const { setupDbHandlers } = require('./src/controllers/db-controller');
const { setupPrintHandlers } = require('./src/controllers/print-controller');
const { setupEnvHandlers } = require('./src/controllers/env-controller');
const { seedDatabase } = require('./src/db/seeder');
const db = require('./src/db');
const SyncServer = require('./src/db/sync-server');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Setup hot reload in development mode
if (process.argv.includes('--dev')) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
    // Watch these directories for changes
    watched: [
      path.join(__dirname, 'src'),
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'preload.js'),
      path.join(__dirname, 'renderer.js'),
      path.join(__dirname, 'dist'),
    ]
  });
}

let mainWindow;
let syncServer = null;

// Initialize database system
async function initializeDatabase() {
  try {
    console.log('Initializing database system...');
    const result = await db.initializeDatabase();
    
    if (result.success) {
      console.log(`Database initialized successfully. Using ${result.useRxDb ? 'RxDB' : 'NeDB'}`);
      
      // Start sync server if enabled in development
      if (process.env.START_SYNC_SERVER === 'true') {
        syncServer = new SyncServer({
          port: process.env.SYNC_SERVER_PORT || 3001
        });
        await syncServer.start();
        console.log('Sync server started');
      }
    } else {
      console.warn('Database initialization had issues:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return { success: false, error };
  }
}

// Function to run database seeder if enabled
async function runDatabaseSeeder() {
  // Check if SEED_DATABASE is true in the .env file
  if (process.env.SEED_DATABASE === 'true') {
    console.log('SEED_DATABASE is enabled. Running database seeder...');
    
    try {
      const result = await seedDatabase({
        enabled: true,
        numCategories: 10,
        numProducts: 30,
        clearExisting: true, // Clear existing data before seeding
        seedPriceMin: 5,
        seedPriceMax: 500,
        seedStockMin: 1,
        seedStockMax: 100
      });
      
      console.log('Database seeding result:', result);
    } catch (error) {
      console.error('Error running database seeder:', error);
    }
  }
}

function createWindow() {
  // Get the screen dimensions
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: Math.min(1400, width * 0.9),
    height: Math.min(900, height * 0.9),
    minWidth: 1000,
    minHeight: 700,
    frame: false, // Frameless window
    titleBarStyle: 'hidden',
    transparent: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'assets/images/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Add permissions for camera
      permissions: ['camera'],
      // Allow Web Workers
      webSecurity: true,
      // Disable developer tools in production
      devTools: process.argv.includes('--dev')
    }
  });

  // Disable context menu to prevent right-click inspect element
  mainWindow.webContents.on('context-menu', (e, params) => {
    // Only allow context menu in dev mode
    if (!process.argv.includes('--dev')) {
      e.preventDefault();
    }
  });

  // Prevent keyboard shortcuts for opening dev tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Block F12 and Ctrl+Shift+I in production
    if (!process.argv.includes('--dev')) {
      if (input.key === 'F12' || 
          (input.control && input.shift && input.key.toLowerCase() === 'i') ||
          (input.control && input.shift && input.key.toLowerCase() === 'c')) {
        event.preventDefault();
      }
    }
  });

  // Set proper permissions for media access
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      // Grant camera access permission
      return callback(true);
    }
    callback(false);
  });

  // Set Content Security Policy to allow Web Workers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src blob: 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; media-src 'self' blob:;"
        ]
      }
    });
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Disable developer tools globally in production
  if (!process.argv.includes('--dev')) {
    app.on('browser-window-created', (_, window) => {
      window.webContents.on('devtools-opened', () => {
        window.webContents.closeDevTools();
      });
    });
  }

  // Set default Content Security Policy for all sessions
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src blob: 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; media-src 'self' blob:;"
        ]
      }
    });
  });

  // Initialize database first
  await initializeDatabase();

  // Set up handlers
  setupDbHandlers();
  setupPrintHandlers();
  setupEnvHandlers();

  // Run database seeder if enabled
  await runDatabaseSeeder();

  createWindow();
  
  // Handle window control events from renderer
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', async () => {
  // Stop sync server if running
  if (syncServer) {
    await syncServer.stop();
  }
  
  // Close database connections
  if (db.isUsingRxDb()) {
    try {
      const rxDatabase = await db.getCurrentDatabase();
      if (rxDatabase) {
        await rxDatabase.destroy();
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process code.
// IPC handlers will be added here for database operations, printing, etc. 