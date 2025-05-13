import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconX, IconInfoCircle, IconCheck, IconChevronRight, IconPackages } from '@tabler/icons-react';

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
        className="relative p-2 rounded-full text-dark-500 dark:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none transition-colors duration-200"
        aria-label="Stock notifications"
        title={`${lowStockItems.length} items with low stock`}
      >
        <div className="relative">
          <IconBell size={20} className={hasNewAlerts ? "animate-pulse text-amber-500 dark:text-amber-400" : ""} />
          
          {/* Notification Badge */}
          {lowStockItems.length > 0 && (
            <div className="absolute -top-1 -right-1">
              <div className="h-4 w-4 bg-red-500 dark:bg-red-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
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
          className="absolute top-11 right-0 w-80 max-h-[80vh] overflow-hidden bg-white dark:bg-dark-700 rounded-xl shadow-medium dark:shadow-xl border border-gray-200 dark:border-dark-500 z-[100] animate-slide-down"
        >
          {/* Header Bar */}
          <div className="sticky top-0 bg-gray-50 dark:bg-dark-600 p-3 border-b border-gray-200 dark:border-dark-500 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <IconInfoCircle size={18} className="text-dark-400 dark:text-dark-300" />
              <h3 className="font-medium text-dark-700 dark:text-white">Inventory Alerts</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-dark-500 dark:text-dark-300 hover:text-dark-700 dark:hover:text-white rounded-full p-1 hover:bg-gray-200 dark:hover:bg-dark-500 transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>
          
          {/* Notification Content */}
          <div className="overflow-auto max-h-[calc(80vh-7.5rem)] dark:bg-dark-700">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6 text-dark-500 dark:text-dark-300">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-dark-500 border-t-primary-500 dark:border-t-primary-400 rounded-full animate-spin mb-3"></div>
                <p className="text-sm">Checking inventory levels...</p>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-dark-500 dark:text-dark-300">
                <IconCheck size={40} className="text-green-500 dark:text-green-400 mb-2" />
                <p className="text-sm">All stock levels are healthy</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-dark-600">
                {lowStockItems.map(item => (
                  <li key={item._id} className="hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors">
                    <button 
                      onClick={() => handleProductClick(item)}
                      className="w-full p-3 flex items-center text-left"
                      title="Click to go to product"
                    >
                      {/* Product Image or Initials */}
                      <div className="w-10 h-10 bg-gray-100 dark:bg-dark-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-dark-600 dark:text-dark-200">
                            {item.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-dark-800 dark:text-white truncate block">{item.name}</span>
                        <div className="flex items-center mt-1">
                          <span className={`text-xs font-medium ${
                            item.stock <= Math.floor(threshold / 3) 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            Only {item.stock} in stock
                          </span>
                        </div>
                      </div>
                      
                      {/* Arrow indicator */}
                      <IconChevronRight size={16} className="text-dark-400 dark:text-dark-300 ml-2" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer Section */}
          {!isLoading && lowStockItems.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 dark:bg-dark-600 p-3 border-t border-gray-200 dark:border-dark-500 flex justify-between items-center">
              <div className="text-xs text-dark-500 dark:text-dark-300 flex items-center">
                <IconInfoCircle size={14} className="mr-1 text-dark-400 dark:text-dark-300" />
                <span>
                  Alert threshold: <span className="font-medium">{threshold}</span> items
                </span>
              </div>
              <button 
                onClick={handleStockManagement}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center"
              >
                <IconPackages size={14} className="mr-1" />
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