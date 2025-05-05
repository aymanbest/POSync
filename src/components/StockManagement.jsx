import React, { useState, useEffect, useRef } from 'react';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [settings, setSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const barcodeInputRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsData = await window.api.database.getProducts();
        const categoriesData = await window.api.database.getCategories();
        const settingsData = await window.api.settings.getSettings();
        
        setProducts(productsData);
        setCategories(categoriesData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        showNotification('Error loading data', 'error');
      }
    };

    fetchData();
  }, []);

  // Focus on barcode input initially
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Format currency based on settings
  const formatCurrency = (amount) => {
    return `${settings?.currency || 'MAD'} ${amount.toFixed(2)}`;
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = e.target.barcode.value.trim();
    
    if (!barcode) return;
    
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      addToStockItems(product);
      e.target.barcode.value = '';
    } else {
      showNotification(`Product with barcode ${barcode} not found`, 'error');
    }
  };

  const addToStockItems = (product) => {
    setStockItems(currentItems => {
      const existingItem = currentItems.find(item => item._id === product._id);
      
      if (existingItem) {
        return currentItems.map(item =>
          item._id === product._id
            ? { ...item, quantityToAdd: item.quantityToAdd + 1 }
            : item
        );
      } else {
        return [...currentItems, { ...product, quantityToAdd: 1 }];
      }
    });
  };

  const updateStockItemQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromStockItems(productId);
      return;
    }
    
    setStockItems(currentItems =>
      currentItems.map(item =>
        item._id === productId
          ? { ...item, quantityToAdd: newQuantity }
          : item
      )
    );
  };

  const removeFromStockItems = (productId) => {
    setStockItems(currentItems => currentItems.filter(item => item._id !== productId));
  };

  const clearStockItems = () => {
    setStockItems([]);
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const matchesSearch = 
        searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm);
      
      return matchesCategory && matchesSearch;
    });
  };

  const handleUpdateStock = async () => {
    if (!stockItems.length) {
      showNotification('No items added', 'error');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update each product's stock
      for (const item of stockItems) {
        const newStock = (item.stock || 0) + item.quantityToAdd;
        await window.api.database.updateProduct(item._id, { stock: newStock });
      }
      
      // Refresh products list
      const updatedProducts = await window.api.database.getProducts();
      setProducts(updatedProducts);
      
      // Clear stock items after successful update
      clearStockItems();
      showNotification('Stock updated successfully', 'success');
    } catch (error) {
      console.error('Stock update error:', error);
      showNotification('Error updating stock', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      
      {/* Product Selection */}
      <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
        <h1 className="text-2xl font-bold mb-4">Stock Management</h1>
        
        <div className="mb-4">
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            {/* Barcode Scanner */}
            <form onSubmit={handleBarcodeSubmit} className="flex-1">
              <div className="flex">
                <input
                  ref={barcodeInputRef}
                  name="barcode"
                  type="text"
                  placeholder="Scan barcode or enter product ID"
                  className="flex-1 border border-gray-300 p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  className="bg-blue-500 text-white p-2 rounded-r-md hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </form>
            
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Categories */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-md text-sm ${
                selectedCategory === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category._id}
                onClick={() => setSelectedCategory(category._id)}
                className={`px-3 py-1 rounded-md text-sm whitespace-nowrap ${
                  selectedCategory === category._id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {getFilteredProducts().map(product => (
            <div 
              key={product._id}
              onClick={() => addToStockItems(product)}
              className="bg-white border border-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors"
            >
              <div className="text-center">
                <div className="h-16 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="max-h-full max-w-full object-contain" 
                    />
                  ) : (
                    <div className="bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{product.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium truncate" title={product.name}>
                  {product.name}
                </div>
                <div className="text-sm text-gray-700 font-medium">
                  {formatCurrency(product.price)}
                </div>
                <div className="text-xs mt-1 font-medium">
                  Current Stock: {product.stock || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stock Items */}
      <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-10rem)] flex flex-col">
        <h2 className="text-lg font-medium mb-3">Items to Restock</h2>
        
        {/* Stock Items List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {stockItems.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2">No items added</p>
              <p className="text-sm">Click on products to add them for restocking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stockItems.map(item => (
                <div key={item._id} className="flex justify-between items-center border-b pb-2">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-600">
                      Current stock: {item.stock || 0}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-xs font-medium mr-2 text-gray-500">
                      Add:
                    </div>
                    <div className="flex items-center border rounded">
                      <button 
                        onClick={() => updateStockItemQuantity(item._id, item.quantityToAdd - 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-2">{item.quantityToAdd}</span>
                      <button 
                        onClick={() => updateStockItemQuantity(item._id, item.quantityToAdd + 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromStockItems(item._id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Summary */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold mb-3">
            <span>Total Items:</span>
            <span>{stockItems.length}</span>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={clearStockItems}
              disabled={stockItems.length === 0 || isProcessing}
              className={`flex-1 py-2 rounded-md text-white bg-red-500 hover:bg-red-600 ${
                (stockItems.length === 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Clear
            </button>
            <button
              onClick={handleUpdateStock}
              disabled={stockItems.length === 0 || isProcessing}
              className={`flex-1 py-2 rounded-md text-white bg-green-500 hover:bg-green-600 ${
                (stockItems.length === 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isProcessing ? 'Processing...' : 'Update Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockManagement; 