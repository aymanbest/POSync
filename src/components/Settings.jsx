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
    currency: 'USD',
    taxRate: 0,
    receiptFooter: ''
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
          currency: settingsData.currency || 'USD',
          taxRate: settingsData.taxRate || 0,
          receiptFooter: settingsData.receiptFooter || ''
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
      [name]: name === 'taxRate' ? parseFloat(value) || 0 : value
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
              <div>
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
                onClick={() => window.confirm('Are you sure you want to reset all data? This cannot be undone.') && 
                  showNotification('Reset functionality to be implemented', 'info')}
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