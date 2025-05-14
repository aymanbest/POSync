// Environment utilities for managing app configuration

/**
 * Get environment variable value
 */
const getEnvVariable = (name, defaultValue = null) => {
  // Only check actual environment variables
  return process.env[name] !== undefined ? process.env[name] : defaultValue;
};

/**
 * Check if development mode is enabled
 */
const isDevelopmentMode = () => {
  const devMode = getEnvVariable('DEV_MODE', 'false');
  return devMode === 'true' || devMode === true;
};

module.exports = {
  getEnvVariable,
  isDevelopmentMode
}; 