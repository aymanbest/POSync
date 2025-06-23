import React, { useState, useEffect } from 'react';
import { IconLoader2, IconBuilding, IconCash, IconReceipt, IconDatabase, IconCode, IconSettings, IconCloudComputing } from '@tabler/icons-react';
import SyncSettings from './SyncSettings';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [seederState, setSeederState] = useState({
    enabled: false,
    numCategories: 10,
    numProducts: 30,
    clearExisting: false,
    isLoading: false
  });
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    currency: 'MAD',
    taxRate: 0,
    taxType: 'added', // 'added', 'included', or 'disabled'
    taxName: 'Tax',
    taxDescription: '',
    receiptFooter: '',
    lowStockThreshold: 5, // Default low stock threshold
    useNumPad: true, // Default to use numpad
    paymentMethods: {
      cash: true,
      card: true
    }
  });

  // Fetch settings and check dev mode on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settingsData = await window.api.settings.getSettings();
        setSettings(settingsData);
        
        // Set form data
        setFormData({
          businessName: settingsData.businessName || '',
          address: settingsData.address || '',
          phone: settingsData.phone || '',
          email: settingsData.email || '',
          currency: settingsData.currency || 'MAD',
          taxRate: settingsData.taxRate || 0,
          taxType: settingsData.taxType || 'added',
          taxName: settingsData.taxName || 'Tax',
          taxDescription: settingsData.taxDescription || '',
          receiptFooter: settingsData.receiptFooter || '',
          lowStockThreshold: settingsData.lowStockThreshold || 5,
          useNumPad: settingsData.useNumPad !== undefined ? settingsData.useNumPad : true,
          paymentMethods: settingsData.paymentMethods || { cash: true, card: true }
        });

        // Check if development mode is enabled
        const devMode = await window.api.env.isDevelopmentMode();
        setIsDevelopmentMode(devMode);
      } catch (error) {
        console.error('Error fetching settings:', error);
        showNotification('Failed to load settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle payment method checkboxes
    if (name.startsWith('paymentMethod.')) {
      const method = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        paymentMethods: {
          ...prev.paymentMethods,
          [method]: checked
        }
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              name === 'taxRate' ? parseFloat(value) || 0 : 
              name === 'lowStockThreshold' ? parseInt(value) || 0 : 
              value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await window.api.settings.updateSettings(formData);
      setSettings(formData);
      showNotification('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const result = await window.api.database.exportDatabase();
      
      if (result.success) {
        showNotification(`Database successfully exported to ${result.path}`, 'success');
      } else {
        showNotification(result.message || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Error exporting database:', error);
      showNotification('Export failed: An unexpected error occurred', 'error');
    }
  };

  const handleImportDatabase = async () => {
    // Ask for confirmation before proceeding
    if (!window.confirm('Warning: Importing a database will overwrite all existing data. This action cannot be undone. Do you want to continue?')) {
      return;
    }
    
    try {
      const result = await window.api.database.importDatabase();
      
      if (result.success) {
        showNotification('Database imported successfully. The application will reload.', 'success');
        
        // Reload the application after a short delay to ensure the notification is seen
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        showNotification(result.message || 'Import failed', 'error');
      }
    } catch (error) {
      console.error('Error importing database:', error);
      showNotification('Import failed: An unexpected error occurred', 'error');
    }
  };

  const handleResetDatabase = async () => {
    // Ask for double confirmation before proceeding
    if (!window.confirm('WARNING: This will permanently delete ALL your data including products, categories, and transactions. This action CANNOT be undone. Do you want to continue?')) {
      return;
    }
    
    // Second confirmation with specific text to prevent accidental resets
    if (!window.confirm('Please confirm again: All your data will be permanently erased and the setup wizard will appear on next launch.')) {
      return;
    }
    
    try {
      const result = await window.api.database.resetDatabase();
      
      if (result.success) {
        showNotification('Database has been reset. Please restart the application to begin setup.', 'success');
        
        // Clear local storage to remove any cached user data
        localStorage.removeItem('user');
        
        // Inform the user they need to restart the app
        setTimeout(() => {
          alert('The database has been reset. Please close and restart the application to complete the setup process.');
          window.close(); // Attempt to close the app window
        }, 3000);
      } else {
        showNotification(result.message || 'Reset failed', 'error');
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      showNotification('Reset failed: An unexpected error occurred', 'error');
    }
  };

  const handleSeederChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSeederState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
             (name === 'numCategories' || name === 'numProducts') ? parseInt(value) || 0 : value
    }));
  };

  const handleRunSeeder = async () => {
    // Confirm before proceeding
    if (!window.confirm('This will generate sample data for development. Continue?')) {
      return;
    }
    
    setSeederState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Run the seeder with the configured options
      const result = await window.api.database.seedDatabase({
        enabled: true, // Enable for this call
        numCategories: seederState.numCategories,
        numProducts: seederState.numProducts,
        clearExisting: seederState.clearExisting,
        seedPriceMin: 5,
        seedPriceMax: 500,
        seedStockMin: 1, 
        seedStockMax: 100
      });
      
      if (result.success) {
        showNotification('Sample data generated successfully. Refreshing page...', 'success');
        
        // Reload after a short delay to show the notification
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showNotification(result.message || 'Failed to generate sample data', 'error');
      }
    } catch (error) {
      console.error('Error running seeder:', error);
      showNotification('Failed to generate sample data: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setSeederState(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="animate-pulse-slow text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
            <IconLoader2 className="w-10 h-10 text-primary-500 dark:text-primary-400 animate-spin" />
          </div>
          <p className="mt-4 text-gray-500 dark:text-dark-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in">
      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md shadow-md ${
            notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          } text-white z-50`}
        >
          {notification.message}
        </div>
      )}
      
      
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-dark-600">
        <div className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('business')}
            className={`flex items-center px-5 py-3 font-medium text-sm transition-colors duration-150 whitespace-nowrap
              ${activeTab === 'business' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white'
              }`}
          >
            <IconBuilding size={20} className="mr-2" />
            Business
          </button>
          
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center px-5 py-3 font-medium text-sm transition-colors duration-150 whitespace-nowrap
              ${activeTab === 'financial' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white'
              }`}
          >
            <IconCash size={20} className="mr-2" />
            Financial
          </button>
          
          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex items-center px-5 py-3 font-medium text-sm transition-colors duration-150 whitespace-nowrap
              ${activeTab === 'receipt' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white'
              }`}
          >
            <IconReceipt size={20} className="mr-2" />
            Receipt
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center px-5 py-3 font-medium text-sm transition-colors duration-150 whitespace-nowrap
              ${activeTab === 'sync' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white'
              }`}
          >
            <IconCloudComputing size={20} className="mr-2" />
            Sync
          </button>
          
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center px-5 py-3 font-medium text-sm transition-colors duration-150 whitespace-nowrap
              ${activeTab === 'database' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white'
              }`}
          >
            <IconDatabase size={20} className="mr-2" />
            Database
          </button>
          
          {isDevelopmentMode && (
            <button
              onClick={() => setActiveTab('developer')}
              className={`flex items-center px-5 py-3 font-medium text-sm transition-colors duration-150 whitespace-nowrap
                ${activeTab === 'developer' 
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                  : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white'
                }`}
            >
              <IconCode size={20} className="mr-2" />
              Developer
            </button>
          )}
        </div>
      </div>
      
      <div className="pb-10">
        {/* Business Tab */}
        {activeTab === 'business' && (
          <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-dark-800 dark:text-white flex items-center">
                  <IconBuilding size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
                  Business Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-dark-500 pt-6">
                <h3 className="text-md font-medium mb-3 text-dark-800 dark:text-white">Inventory Settings</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Low Stock Threshold
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      name="lowStockThreshold"
                      value={formData.lowStockThreshold}
                      onChange={handleInputChange}
                      min="0"
                      step="1"
                      className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-dark-300 mt-1">
                    You'll receive notifications when product stock falls below this quantity
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Business Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-dark-800 dark:text-white flex items-center">
                  <IconCash size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
                  Currency Settings
                </h2>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    >
                      <option value="MAD">MAD (DH)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="AUD">AUD (A$)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CNY">CNY (¥)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-dark-300 mt-2">
                      This currency will be used throughout the application for all transactions and reports.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-dark-500 pt-6">
                <h3 className="text-md font-medium mb-4 text-dark-800 dark:text-white flex items-center">
                  Tax Configuration
                </h3>
                
                <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                    Tax Type
                  </label>
                  <select
                    name="taxType"
                    value={formData.taxType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  >
                    <option value="added">Added to Price</option>
                    <option value="included">Included in Price</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-dark-300 mt-2">
                    {formData.taxType === 'added' 
                      ? 'Tax is calculated on top of product prices'
                      : formData.taxType === 'included'
                      ? 'Products already include tax in their prices'
                      : 'No tax will be applied to transactions'}
                  </p>
                </div>
                
                {formData.taxType !== 'disabled' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                        Tax Name
                      </label>
                      <input
                        type="text"
                        name="taxName"
                        value={formData.taxName}
                        onChange={handleInputChange}
                        placeholder="VAT, GST, Sales Tax, etc."
                        className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        name="taxRate"
                        value={formData.taxRate}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                        Tax Description (Optional)
                      </label>
                      <textarea
                        name="taxDescription"
                        value={formData.taxDescription}
                        onChange={handleInputChange}
                        rows="2"
                        placeholder="Tax registration number or other details"
                        className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Financial Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Receipt Tab */}
        {activeTab === 'receipt' && (
          <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-dark-800 dark:text-white flex items-center">
                  <IconReceipt size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
                  Receipt Settings
                </h2>
                
                <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Receipt Footer
                  </label>
                  <textarea
                    name="receiptFooter"
                    value={formData.receiptFooter}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Thank you for your business!"
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  ></textarea>
                  <p className="text-xs text-gray-500 dark:text-dark-300 mt-2">
                    This text will appear at the bottom of all receipts
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-dark-500 pt-6">
                <h3 className="text-md font-medium mb-4 text-dark-800 dark:text-white">POS Settings</h3>
                
                <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useNumPad"
                      name="useNumPad"
                      checked={formData.useNumPad}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useNumPad" className="ml-2 block text-sm font-medium text-gray-700 dark:text-dark-200">
                      Use Number Pad for Cash Payments
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-dark-300 mt-2 ml-6">
                    Enable calculator-style number pad for entering cash payment amounts
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-dark-600/50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                    Payment Methods
                  </label>
                  <p className="text-xs text-gray-500 dark:text-dark-300 mb-3">
                    Select which payment methods to enable in the POS
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center p-2 border border-gray-200 dark:border-dark-500 rounded-md">
                      <input
                        type="checkbox"
                        id="paymentMethod.cash"
                        name="paymentMethod.cash"
                        checked={formData.paymentMethods.cash}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="paymentMethod.cash" className="ml-2 block text-sm font-medium text-gray-700 dark:text-dark-200">
                        Cash
                      </label>
                    </div>
                    
                    <div className="flex items-center p-2 border border-gray-200 dark:border-dark-500 rounded-md">
                      <input
                        type="checkbox"
                        id="paymentMethod.card"
                        name="paymentMethod.card"
                        checked={formData.paymentMethods.card}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="paymentMethod.card" className="ml-2 block text-sm font-medium text-gray-700 dark:text-dark-200">
                        Card/Credit Card
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Receipt & POS Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
            <SyncSettings />
          </div>
        )}
        
        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold mb-6 text-dark-800 dark:text-white flex items-center">
              <IconDatabase size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
              Database Management
            </h2>
            
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-md font-medium mb-2 text-green-800 dark:text-green-400 flex items-center">
                  Backup Database
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-300 mb-4">
                  Export your database to a file that can be used to restore your data later.
                </p>
                <button
                  onClick={handleExportDatabase}
                  className="w-full bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 flex items-center justify-center"
                >
                  Export Database
                </button>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-md font-medium mb-2 text-yellow-800 dark:text-yellow-400 flex items-center">
                  Restore Database
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-300 mb-2">
                  Import a previously exported database file.
                </p>
                <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-md mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                    Warning: This will overwrite your current data.
                  </p>
                </div>
                <button
                  onClick={handleImportDatabase}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 flex items-center justify-center"
                >
                  Import Database
                </button>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="text-md font-medium mb-2 text-red-800 dark:text-red-400 flex items-center">
                  Reset Database
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-300 mb-2">
                  Reset your database to factory defaults.
                </p>
                <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-md mb-4">
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                    Warning: This will permanently delete ALL your data including products, categories, and transactions. This action CANNOT be undone.
                  </p>
                </div>
                <button
                  onClick={handleResetDatabase}
                  className="w-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 flex items-center justify-center"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Developer Tab */}
        {isDevelopmentMode && activeTab === 'developer' && (
          <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-dark-800 dark:text-white flex items-center">
                <IconCode size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
                Developer Tools
              </h2>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 text-xs rounded-full">
                Development Only
              </span>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h3 className="text-md font-medium mb-2 text-indigo-800 dark:text-indigo-400 flex items-center">
                Sample Data Generator
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-300 mb-4">
                Generate sample products and categories for development and testing purposes.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Number of Categories
                  </label>
                  <input
                    type="number"
                    name="numCategories"
                    value={seederState.numCategories}
                    onChange={handleSeederChange}
                    min="1"
                    max="50"
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Number of Products
                  </label>
                  <input
                    type="number"
                    name="numProducts"
                    value={seederState.numProducts}
                    onChange={handleSeederChange}
                    min="1"
                    max="100"
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="clearExisting"
                    name="clearExisting"
                    checked={seederState.clearExisting}
                    onChange={handleSeederChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="clearExisting" className="ml-2 block text-sm text-gray-700 dark:text-dark-200">
                    Clear existing products and categories
                  </label>
                </div>
                <div className="mt-2 bg-red-100 dark:bg-red-900/40 p-3 rounded-md">
                  <p className="text-xs text-red-800 dark:text-red-300">
                    Warning: This will delete all existing products and categories before generating new ones.
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleRunSeeder}
                disabled={seederState.isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {seederState.isLoading ? (
                  <>
                    <IconLoader2 className="animate-spin mr-2 h-4 w-4 text-white" />
                    Generating...
                  </>
                ) : (
                  'Generate Sample Data'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;