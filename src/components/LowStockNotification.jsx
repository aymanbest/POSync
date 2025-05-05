import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const LowStockNotification = ({ settings }) => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const threshold = settings?.lowStockThreshold || 5;
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Fetch low stock items on component mount and when threshold changes
  useEffect(() => {
    const fetchLowStockItems = async () => {
      setIsLoading(true);
      try {
        const products = await window.api.database.getProducts();
        
        // Filter products with stock below threshold
        const lowStockProducts = products.filter(product => 
          product.stock !== undefined && 
          product.stock <= threshold && 
          product.stock > 0 // Only show products that are low but not out of stock
        );
        
        // Sort by stock level (lowest first)
        lowStockProducts.sort((a, b) => a.stock - b.stock);
        
        // Check if there are new alerts
        if (lowStockProducts.length > lowStockItems.length) {
          setHasNewAlerts(true);
        }
        
        setLowStockItems(lowStockProducts);
      } catch (error) {
        console.error('Error fetching low stock items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLowStockItems();
    
    // Set up periodic check every 5 minutes
    const intervalId = setInterval(fetchLowStockItems, 5 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [threshold, lowStockItems.length]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && 
          menuRef.current && 
          !menuRef.current.contains(event.target) &&
          buttonRef.current && 
          !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
    setHasNewAlerts(false); // Clear new alerts indicator when opening
  };

  const handleProductClick = (product) => {
    // Navigate to products page with the product name as search term
    navigate(`/products?search=${encodeURIComponent(product.name)}`);
    setIsOpen(false);
  };

  const handleStockManagement = () => {
    navigate('/stock-management');
    setIsOpen(false);
  };

  // No notification if no low stock items and no loading
  if (lowStockItems.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={togglePanel}
        className="relative flex items-center justify-center p-1.5 rounded-md transition-all duration-300 ease-in-out"
        aria-label="Stock notifications"
        title={`${lowStockItems.length} items with low stock`}
      >
        <div className="relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            className="h-6 w-6 text-gray-300 hover:text-white"
            fill="none" 
            strokeWidth="2" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          
          {/* Notification Badge */}
          {lowStockItems.length > 0 && (
            <div className="absolute -top-1 -right-1">
              <div className="h-4 w-4 bg-red-600 rounded-full text-white text-xs font-bold flex items-center justify-center">
                {lowStockItems.length}
              </div>
            </div>
          )}
        </div>
      </button>
      
      {/* Notification Panel with Animation */}
      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute top-10 right-0 w-80 max-h-[80vh] overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 z-[100]"
        >
          {/* Header Bar */}
          <div className="sticky top-0 bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-gray-700">Inventory Alerts</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-200 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Notification Content */}
          <div className="overflow-auto max-h-[calc(80vh-7.5rem)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6 text-gray-500">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                <p className="text-sm">Checking inventory levels...</p>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm">All stock levels are healthy</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {lowStockItems.map(item => (
                  <li key={item._id} className="hover:bg-gray-50 transition-colors">
                    <button 
                      onClick={() => handleProductClick(item)}
                      className="w-full p-3 flex items-center text-left"
                      title="Click to go to product"
                    >
                      {/* Product Image or Initials */}
                      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-gray-600">
                            {item.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 truncate block">{item.name}</span>
                        <div className="flex items-center mt-1">
                          <span className={`text-xs font-medium ${
                            item.stock <= Math.floor(threshold / 3) 
                              ? 'text-red-600' 
                              : 'text-orange-500'
                          }`}>
                            Only {item.stock} in stock
                          </span>
                        </div>
                      </div>
                      
                      {/* Arrow indicator */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer Section */}
          {!isLoading && lowStockItems.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 p-3 border-t border-gray-200 flex justify-between items-center">
              <div className="text-xs text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Alert threshold: <span className="font-medium">{threshold}</span> items
                </span>
              </div>
              <button 
                onClick={handleStockManagement}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
              >
                Manage Inventory
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LowStockNotification; 