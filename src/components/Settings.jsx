import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
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
    lowStockThreshold: 5 // Default low stock threshold
  });

  // Fetch settings on component mount
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
          lowStockThreshold: settingsData.lowStockThreshold || 5
        });
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'taxRate' ? parseFloat(value) || 0 : 
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
    if (!window.confirm('Please confirm again: All your data will be permanently erased and the application will be reset to factory defaults.')) {
      return;
    }
    
    try {
      const result = await window.api.database.resetDatabase();
      
      if (result.success) {
        showNotification('Database has been reset to factory defaults. The application will reload.', 'success');
        
        // Reload the application after a short delay to ensure the notification is seen
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        showNotification(result.message || 'Reset failed', 'error');
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      showNotification('Reset failed: An unexpected error occurred', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="relative">
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
      
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Business Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <h2 className="text-lg font-medium mt-6 mb-4">Financial Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
              
              {/* Inventory Settings */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium mb-3">Inventory Settings</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    You'll receive notifications when product stock falls below this quantity
                  </p>
                </div>
              </div>
              
              {/* Tax Settings */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium mb-3">Tax Configuration</h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Type
                  </label>
                  <select
                    name="taxType"
                    value={formData.taxType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="added">Added to Price</option>
                    <option value="included">Included in Price</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.taxType === 'added' 
                      ? 'Tax is calculated on top of product prices'
                      : formData.taxType === 'included'
                      ? 'Products already include tax in their prices'
                      : 'No tax will be applied to transactions'}
                  </p>
                </div>
                
                {formData.taxType !== 'disabled' && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Name
                      </label>
                      <input
                        type="text"
                        name="taxName"
                        value={formData.taxName}
                        onChange={handleInputChange}
                        placeholder="VAT, GST, Sales Tax, etc."
                        className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Description (Optional)
                      </label>
                      <textarea
                        name="taxDescription"
                        value={formData.taxDescription}
                        onChange={handleInputChange}
                        rows="2"
                        placeholder="Tax registration number or other details"
                        className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      ></textarea>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <h2 className="text-lg font-medium mt-6 mb-4">Receipt Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Footer
                </label>
                <textarea
                  name="receiptFooter"
                  value={formData.receiptFooter}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Thank you for your business!"
                  className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Database Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Database Management</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium mb-2">Backup Database</h3>
              <p className="text-sm text-gray-600 mb-3">
                Export your database to a file that can be used to restore your data.
              </p>
              <button
                onClick={handleExportDatabase}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md"
              >
                Export Database
              </button>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-md font-medium mb-2">Restore Database</h3>
              <p className="text-sm text-gray-600 mb-3">
                Import a previously exported database file.
                <span className="text-red-500 font-medium"> Warning: This will overwrite your current data.</span>
              </p>
              <button
                onClick={handleImportDatabase}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md"
              >
                Import Database
              </button>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-md font-medium mb-2">Advanced</h3>
              <p className="text-sm text-gray-600 mb-3">
                Reset your database to factory defaults.
                <span className="text-red-500 font-medium"> Warning: This action cannot be undone.</span>
              </p>
              <button
                onClick={handleResetDatabase}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 