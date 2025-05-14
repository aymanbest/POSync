const { ipcMain } = require('electron');
const { getEnvVariable, isDevelopmentMode } = require('../utils/env');

const setupEnvHandlers = () => {
  // Get a specific environment variable
  ipcMain.handle('env:get', async (event, name, defaultValue) => {
    return getEnvVariable(name, defaultValue);
  });
  
  // Check if development mode is enabled
  ipcMain.handle('env:isDevelopmentMode', async () => {
    return isDevelopmentMode();
  });
};

module.exports = { setupEnvHandlers }; 