import React, { useState, useEffect, useRef } from 'react';
import ReceiptModal from './POS/ReceiptModal';
import QRCodeScanner from './BarcodeScanner';
import { 
  IconShoppingCart, 
  IconSearch, 
  IconBarcode, 
  IconPlus, 
  IconMinus, 
  IconTrash, 
  IconCash, 
  IconCreditCard, 
  IconDiscount, 
  IconX,
  IconReceiptTax,
  IconBackspace
} from '@tabler/icons-react';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [settings, setSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const barcodeInputRef = useRef(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'flat'
  const [discountValue, setDiscountValue] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const productsContainerRef = useRef(null);
  const cartContainerRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsData = await window.api.database.getProducts();
        const categoriesData = await window.api.database.getCategories();
        const settingsData = await window.api.settings.getSettings();
        
        // Log settings for debugging
        console.log('Settings loaded:', settingsData);
        console.log('useNumPad setting:', settingsData?.useNumPad);
        console.log('paymentMethods setting:', settingsData?.paymentMethods);
        
        setProducts(productsData);
        setCategories(categoriesData);
        setSettings(settingsData);
        
        // Set default payment method based on available methods
        if (settingsData?.paymentMethods) {
          // If only card is enabled, default to card
          if (!settingsData.paymentMethods.cash && settingsData.paymentMethods.card) {
            setPaymentMethod('card');
            // We'll set the payment amount once we have products loaded and cart initialized
          }
          // If only cash is enabled, default to cash
          else if (settingsData.paymentMethods.cash && !settingsData.paymentMethods.card) {
            setPaymentMethod('cash');
          }
          // If both are disabled, we'll still show cash as fallback
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        showNotification('Error loading data', 'error');
      }
    };

    fetchData();
  }, []);

  // Set payment amount for card when it's the only option or when switching to card
  useEffect(() => {
    if (paymentMethod === 'card') {
      const total = calculateTotal();
      setPaymentAmount(total.toString());
    }
  }, [paymentMethod, cart, discount, settings?.taxRate, settings?.taxType]);

  // Check if containers need scroll indicators
  useEffect(() => {
    const updateScrollableClass = () => {
      if (productsContainerRef.current) {
        const productsEl = productsContainerRef.current;
        if (productsEl.scrollHeight > productsEl.clientHeight) {
          productsEl.classList.add('scrollable-content');
        } else {
          productsEl.classList.remove('scrollable-content');
        }
      }
      
      if (cartContainerRef.current) {
        const cartEl = cartContainerRef.current;
        if (cartEl.scrollHeight > cartEl.clientHeight) {
          cartEl.classList.add('scrollable-content');
        } else {
          cartEl.classList.remove('scrollable-content');
        }
      }
    };
    
    // Run initially
    updateScrollableClass();
    
    // Set up a resize observer to check when window or content changes
    const resizeObserver = new ResizeObserver(() => {
      updateScrollableClass();
    });
    
    if (productsContainerRef.current) {
      resizeObserver.observe(productsContainerRef.current);
    }
    
    if (cartContainerRef.current) {
      resizeObserver.observe(cartContainerRef.current);
    }
    
    // Update when products change
    updateScrollableClass();
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [products, cart, selectedCategory, searchTerm]);

  // Focus on barcode input initially
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Setup custom scroll behavior
  useEffect(() => {
    const handleCustomScroll = (containerRef, event) => {
      if (!containerRef.current) return;
      
      // Add slight resistance to scrolling for a smoother feel
      const delta = event.deltaY * 0.8;
      
      // Animate the scroll with smooth behavior
      containerRef.current.scrollBy({
        top: delta,
        behavior: 'smooth'
      });
      
      // Prevent default to use our custom scrolling
      event.preventDefault();
    };
    
    const productsContainer = productsContainerRef.current;
    const cartContainer = cartContainerRef.current;
    
    // Products container scroll handler
    const handleProductsScroll = (e) => handleCustomScroll(productsContainerRef, e);
    
    // Cart container scroll handler
    const handleCartScroll = (e) => handleCustomScroll(cartContainerRef, e);
    
    // Add event listeners
    if (productsContainer) {
      productsContainer.addEventListener('wheel', handleProductsScroll, { passive: false });
    }
    
    if (cartContainer) {
      cartContainer.addEventListener('wheel', handleCartScroll, { passive: false });
    }
    
    // Clean up
    return () => {
      if (productsContainer) {
        productsContainer.removeEventListener('wheel', handleProductsScroll);
      }
      
      if (cartContainer) {
        cartContainer.removeEventListener('wheel', handleCartScroll);
      }
    };
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Format currency based on settings
  const formatCurrency = (amount) => {
    return `${settings?.currency || 'MAD'} ${amount.toFixed(2)}`;
  };

  // Handle barcode detection from scanner
  const handleBarcodeDetected = (barcode) => {
    if (!barcode) return;
    
    // Find product with exact barcode match
    const product = products.find(p => p.barcode && p.barcode === barcode);
    
    if (product) {
      // Check if product is in stock before adding
      if (product.stock <= 0) {
        showNotification(`${product.name} is out of stock`, 'error');
      } else {
        // Mark product as coming from barcode scanner
        addToCart({...product, _scanOrigin: true});
        showNotification(`Added ${product.name} to cart`, 'success');
      }
    } else {
      showNotification(`Product with barcode ${barcode} not found`, 'error');
    }
    
    // Close the scanner
    setShowScanner(false);
    
    // Focus back on barcode input
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = e.target.barcode.value.trim();
    
    if (!barcode) return;
    
    // Find product with exact barcode match
    const product = products.find(p => p.barcode && p.barcode === barcode);
    
    if (product) {
      // Check if product is in stock before adding
      if (product.stock <= 0) {
        showNotification(`${product.name} is out of stock`, 'error');
      } else {
        // Mark product as coming from barcode scanner
        addToCart({...product, _scanOrigin: true});
      }
      e.target.barcode.value = '';
    } else {
      showNotification(`Product with barcode ${barcode} not found`, 'error');
    }
  };

  const addToCart = (product) => {
    // Check if product has a valid barcode when added through barcode scanner
    if (product._scanOrigin && (!product.barcode || product.barcode.trim() === '')) {
      showNotification(`${product.name} has no barcode assigned`, 'error');
      return;
    }
    
    // Get the effective stock (current stock minus what's already in cart)
    const effectiveStock = product.effectiveStock !== undefined ? 
      product.effectiveStock : getEffectiveStock(product);
    
    // Prevent adding out of stock items
    if (effectiveStock <= 0) {
      showNotification(`${product.name} is out of stock`, 'error');
      return;
    }
    
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item._id === product._id);
      
      if (existingItem) {
        // We already checked effective stock above, so we can safely increment
        return currentCart.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...currentCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateCartItemQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    // Find the product and calculate maximum quantity based on stock
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    // Find current cart item
    const currentItem = cart.find(item => item._id === productId);
    if (!currentItem) return;
    
    // Check if we're trying to increase quantity
    if (newQuantity > currentItem.quantity) {
      // Only need to check stock when increasing
      const effectiveStock = getEffectiveStock(product);
      const availableToAdd = product.stock - currentItem.quantity;
      
      if (availableToAdd <= 0) {
        showNotification(`Not enough stock available for ${product.name}`, 'error');
        return;
      }
      
      // Only allow adding up to the available stock
      const allowedQuantity = Math.min(newQuantity, currentItem.quantity + availableToAdd);
      
      setCart(currentCart =>
        currentCart.map(item =>
          item._id === productId
            ? { ...item, quantity: allowedQuantity }
            : item
        )
      );
    } else {
      // When decreasing quantity, no need to check stock
      setCart(currentCart =>
        currentCart.map(item =>
          item._id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCart(currentCart => currentCart.filter(item => item._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentAmount('');
    setDiscount(0);
    setDiscountValue('');
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const matchesSearch = 
        searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchTerm));
      
      return matchesCategory && matchesSearch;
    });
  };

  const getEffectiveStock = (product) => {
    // Find the product in cart if it exists
    const cartItem = cart.find(item => item._id === product._id);
    // Calculate real-time effective stock by subtracting cart quantity
    return cartItem ? Math.max(0, product.stock - cartItem.quantity) : product.stock;
  };

  // Get products with their effective stock for display
  const getProductsWithEffectiveStock = () => {
    return getFilteredProducts().map(product => ({
      ...product,
      effectiveStock: getEffectiveStock(product)
    }));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return subtotal * (discount / 100);
    } else {
      return discount;
    }
  };

  const calculateTax = () => {
    // If tax is disabled, return 0
    if (settings?.taxType === 'disabled') {
      return 0;
    }
    
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount();
    
    // Different calculation based on tax type
    if (settings?.taxType === 'included') {
      // For tax included in price, we calculate what portion of the price is tax
      // Formula: price - (price / (1 + taxRate/100))
      const taxRate = settings?.taxRate || 0;
      return subtotalAfterDiscount - (subtotalAfterDiscount / (1 + taxRate/100));
    } else {
      // Default is 'added' - tax is added on top of the price
      return subtotalAfterDiscount * (settings?.taxRate || 0) / 100;
    }
  };

  const calculateTotal = () => {
    // If tax is included in the price, we don't need to add it again
    // For tax disabled or added, we calculate normally
    if (settings?.taxType === 'included') {
      // For included tax, the total is just subtotal minus discount
      // (tax is already part of the subtotal)
      return calculateSubtotal() - calculateDiscount();
    } else {
      // For added tax or disabled tax (which returns 0)
      return calculateSubtotal() - calculateDiscount() + calculateTax();
    }
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const payment = parseFloat(paymentAmount) || 0;
    return payment - total;
  };

  const handleCheckout = async () => {
    const total = calculateTotal();
    const payment = parseFloat(paymentAmount) || 0;
    
    if (!cart.length) {
      showNotification('Cart is empty', 'error');
      return;
    }
    
    if (payment < total) {
      showNotification('Payment amount is insufficient', 'error');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const transaction = {
        items: cart.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: calculateSubtotal(),
        discount: calculateDiscount(),
        discountType: discount > 0 ? discountType : null,
        discountValue: discount,
        tax: calculateTax(),
        taxName: settings?.taxName || 'Tax',
        taxRate: settings?.taxRate || 0,
        taxType: settings?.taxType || 'added',
        total: calculateTotal(),
        paymentMethod,
        paymentAmount: payment,
        change: calculateChange(),
        date: new Date()
      };
      
      // Save transaction
      const result = await window.api.transactions.createTransaction(transaction);
      
      // Debug transaction result
      console.log('Transaction saved:', result);
      
      // Update product stock in database
      try {
        // Create an array of product updates
        const stockUpdates = cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        }));
        
        console.log('Updating stock for products:', stockUpdates);
        
        // Update product stock in database
        const stockUpdateResult = await window.api.products.updateStock(stockUpdates);
        console.log('Stock update result:', stockUpdateResult);
        
        // Update local product state to reflect new stock levels
        setProducts(prevProducts => {
          const updatedProducts = prevProducts.map(product => {
            const cartItem = cart.find(item => item._id === product._id);
            if (cartItem) {
              const newStock = Math.max(0, product.stock - cartItem.quantity);
              console.log(`Product ${product.name}: Stock changed from ${product.stock} to ${newStock}`);
              return {
                ...product,
                stock: newStock
              };
            }
            return product;
          });
          return updatedProducts;
        });
        
        // Show notification about stock update
        showNotification('Product stock has been updated', 'success');
      } catch (error) {
        console.error('Error updating product stock:', error);
        showNotification('Failed to update product stock', 'error');
        // Continue with checkout process even if stock update fails
      }
      
      // Store transaction data for the receipt modal
      const completeTransaction = {
        ...transaction,
        _id: result._id,
        receiptId: result.receiptId || `INV${Date.now().toString().slice(-6)}`,
      };
      
      console.log('Complete transaction data:', completeTransaction);
      setCurrentTransaction(completeTransaction);
      
      // Show receipt modal
      setShowReceiptModal(true);
      
      // Clear cart after successful transaction
      clearCart();
      
      // Show success notification with transaction details
      const itemCount = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
      showNotification(
        `Sale completed: ${itemCount} item${itemCount !== 1 ? 's' : ''} for ${formatCurrency(transaction.total)}`,
        'success'
      );
    } catch (error) {
      console.error('Checkout error:', error);
      showNotification('Error processing transaction', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle applying discount
  const handleApplyDiscount = () => {
    if (!discountValue || parseFloat(discountValue) <= 0) {
      showNotification('Please enter a valid discount value', 'error');
      return;
    }

    const value = parseFloat(discountValue);

    // For percentage, validate it's not over 100%
    if (discountType === 'percentage' && value > 100) {
      showNotification('Percentage discount cannot exceed 100%', 'error');
      return;
    }

    // For flat amount, validate it's not more than the subtotal
    if (discountType === 'flat' && value > calculateSubtotal()) {
      showNotification('Discount cannot be greater than subtotal', 'error');
      return;
    }

    setDiscount(value);
    setShowDiscountModal(false);
    showNotification(
      `Discount applied: ${discountType === 'percentage' ? `${value}%` : formatCurrency(value)}`,
      'success'
    );
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row overflow-hidden">
      {/* Left Side - Product List & Categories */}
      <div className="w-full md:w-3/5 flex flex-col h-[40vh] md:h-screen">
        {/* Search & Barcode Scanner - Fixed height */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-dark-700 shadow dark:shadow-none rounded-xl mb-4 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-grow relative">
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconSearch size={18} />
              </div>
            </div>
            
            <form onSubmit={handleBarcodeSubmit} className="flex-grow sm:flex-grow-0 relative">
              <input 
                ref={barcodeInputRef}
                name="barcode"
                type="text" 
                placeholder="Scan barcode..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconBarcode size={18} />
              </div>
              <button 
                type="button" 
                onClick={() => setShowScanner(true)}
                className="absolute inset-y-0 right-0 px-3 flex items-center bg-primary-500 hover:bg-primary-600 text-white rounded-r-lg transition-colors duration-150"
              >
                <IconBarcode size={18} />
              </button>
            </form>
          </div>
        </div>
        
        {/* Category Filter - Fixed height */}
        <div className="flex-shrink-0 px-4 mb-4 flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-150 ${
              selectedCategory === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-700 text-dark-700 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-600'
            }`}
          >
            All Products
          </button>
          
          {categories.map(category => (
            <button
              key={category._id}
              onClick={() => setSelectedCategory(category._id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-150 ${
                selectedCategory === category._id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-dark-700 text-dark-700 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
        
        {/* Products Grid - Take remaining height with scrolling */}
        <div 
          id="products-container" 
          ref={productsContainerRef}
          className="flex-1 h-0 overflow-y-auto px-4 pb-4 custom-scrollbar"
        >
          {getFilteredProducts().length === 0 ? (
            <div className="text-center py-16 text-dark-500 dark:text-dark-300">
              <IconSearch size={48} className="mx-auto mb-4 text-dark-300 dark:text-dark-500" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try searching for something else or selecting a different category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {getProductsWithEffectiveStock().map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  disabled={product.effectiveStock <= 0}
                  className={`bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg shadow-soft dark:shadow-none overflow-hidden transition-all duration-150 ${
                    product.effectiveStock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-300 dark:hover:border-primary-500 hover:-translate-y-1 hover:shadow-medium'
                  }`}
                >
                  <div className="text-center p-2">
                    <div className="h-20 flex items-center justify-center mb-2">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <div className="bg-gray-100 dark:bg-dark-600 w-14 h-14 rounded-full flex items-center justify-center">
                          <span className="text-dark-400 dark:text-dark-300 text-lg font-medium">{product.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-dark-800 dark:text-white truncate px-1">{product.name}</h3>
                    <p className="text-primary-600 dark:text-primary-400 font-semibold mt-1">
                      {formatCurrency(product.price)}
                    </p>
                    <div className={`text-xs mt-1 font-medium px-2 py-0.5 rounded-full inline-block ${
                      product.effectiveStock <= 0 
                        ? 'bg-red-600 text-white' 
                        : product.effectiveStock <= (settings?.lowStockThreshold || 5) 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-green-600 text-white'
                    }`}>
                      {product.effectiveStock !== product.stock ? 
                        `Available: ${product.effectiveStock}/${product.stock}` : 
                        `Stock: ${product.stock}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Right Side - Cart */}
      <div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-screen md:ml-4 mt-4 md:mt-0">
        <div className="bg-white dark:bg-dark-700 shadow-soft dark:shadow-none rounded-xl flex flex-col overflow-hidden transition-colors duration-200">
          {/* Cart Header - Fixed height */}
          <div className="flex-shrink-0 py-3 px-4 border-b border-gray-200 dark:border-dark-600 flex justify-between items-center">
            <h2 className="text-lg font-display font-semibold text-dark-800 dark:text-white flex items-center">
              <IconShoppingCart size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
              Current Cart {cart.length > 0 && `(${cart.length})`}
            </h2>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center ${
                cart.length === 0
                  ? 'bg-gray-100 dark:bg-dark-600 text-dark-400 dark:text-dark-500 cursor-not-allowed'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
              }`}
            >
              <IconTrash size={16} className="mr-1" /> Clear
            </button>
          </div>
          
          {/* Cart Items - Fixed height container */}
          <div 
            id="cart-items-container" 
            ref={cartContainerRef}
            className="flex-shrink-0 overflow-y-auto p-4 border-b border-gray-200 dark:border-dark-600 custom-scrollbar"
            style={{ height: '220px' }}
          >
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-dark-500 dark:text-dark-300">
                <div className="rounded-full bg-primary-50 dark:bg-primary-900/20 p-3 mb-3">
                  <IconShoppingCart size={24} className="text-primary-500 dark:text-primary-400" />
                </div>
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Add products by scanning or clicking on them</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map(item => (
                  <li key={item._id} className="bg-gray-50 dark:bg-dark-600 rounded-lg p-2 flex items-center justify-between transition-colors duration-150">
                    <div className="flex-grow mr-3">
                      <p className="font-medium text-dark-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-sm text-dark-500 dark:text-dark-300">{formatCurrency(item.price)} × {item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-dark-800 dark:text-white">{formatCurrency(item.price * item.quantity)}</p>
                      <div className="flex items-center mt-1 space-x-1">
                        <button 
                          onClick={() => updateCartItemQuantity(item._id, item.quantity - 1)}
                          className="p-1 rounded-md bg-white dark:bg-dark-500 text-dark-500 dark:text-dark-300 hover:bg-gray-200 dark:hover:bg-dark-400"
                        >
                          <IconMinus size={14} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartItemQuantity(item._id, parseInt(e.target.value) || 1)}
                          className="w-10 text-center p-1 text-sm rounded-md border border-gray-200 dark:border-dark-400 bg-white dark:bg-dark-500 text-dark-800 dark:text-white"
                        />
                        <button 
                          onClick={() => updateCartItemQuantity(item._id, item.quantity + 1)}
                          className="p-1 rounded-md bg-white dark:bg-dark-500 text-dark-500 dark:text-dark-300 hover:bg-gray-200 dark:hover:bg-dark-400"
                        >
                          <IconPlus size={14} />
                        </button>
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="p-1 rounded-md bg-white dark:bg-dark-500 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Cart Total - Fixed section */}
          <div className="flex-shrink-0 py-2 px-4 bg-white dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-dark-600 dark:text-dark-300">Subtotal:</span>
                <span className="text-dark-800 dark:text-white font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-dark-600 dark:text-dark-300 flex items-center">
                  Discount:
                  <button 
                    onClick={() => setShowDiscountModal(true)}
                    className="ml-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-600 text-primary-500 dark:text-primary-400 transition-colors duration-150"
                    title="Apply discount"
                  >
                    <IconDiscount size={14} />
                  </button>
                </span>
                <span className="text-red-500 dark:text-red-400 font-medium">
                  {discount > 0 ? `- ${formatCurrency(calculateDiscount())}` : formatCurrency(0)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-dark-600 dark:text-dark-300">Tax ({settings?.taxRate || 0}%):</span>
                <span className="text-dark-800 dark:text-white font-medium">{formatCurrency(calculateTax())}</span>
              </div>
              
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-dark-500">
                <span className="text-dark-800 dark:text-white font-bold">Total:</span>
                <span className="text-dark-800 dark:text-white font-bold">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
          
          {/* Payment Method Selection */}
          <div className="flex-shrink-0 py-2 px-4">
            <label className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-2">Payment Method</label>
            
            {/* When both payment methods are enabled, or when no specific configuration exists */}
            {((!settings?.paymentMethods || (settings.paymentMethods.cash && settings.paymentMethods.card))) && (
              <div className="flex space-x-3">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                    paymentMethod === 'cash'
                      ? 'bg-primary-500 dark:bg-primary-600 text-white'
                      : 'bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 text-dark-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-500'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <IconCash size={18} className="mr-2" /> Cash
                </button>
                
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                    paymentMethod === 'card'
                      ? 'bg-primary-500 dark:bg-primary-600 text-white'
                      : 'bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 text-dark-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-500'
                  }`}
                  onClick={() => {
                    setPaymentMethod('card');
                    setPaymentAmount(calculateTotal().toString());
                  }}
                >
                  <IconCreditCard size={18} className="mr-2" /> Card
                </button>
              </div>
            )}
            
            {/* When only cash is enabled */}
            {settings?.paymentMethods && settings.paymentMethods.cash && !settings.paymentMethods.card && (
              <div className="py-2 px-4 bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 rounded-lg flex items-center">
                <IconCash size={18} className="mr-2 text-primary-500 dark:text-primary-400" /> 
                <span className="text-dark-700 dark:text-dark-200">Cash Payment</span>
              </div>
            )}
            
            {/* When only card is enabled */}
            {settings?.paymentMethods && !settings.paymentMethods.cash && settings.paymentMethods.card && (
              <div className="py-2 px-4 bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 rounded-lg flex items-center">
                <IconCreditCard size={18} className="mr-2 text-primary-500 dark:text-primary-400" /> 
                <span className="text-dark-700 dark:text-dark-200">Card Payment</span>
              </div>
            )}
            
            {/* Show message if no payment methods are enabled */}
            {settings?.paymentMethods && 
             !settings.paymentMethods.cash && 
             !settings.paymentMethods.card && (
              <div className="w-full text-center py-2 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
                No payment methods enabled. Please update settings.
              </div>
            )}
          </div>
          
          {/* Cash payment input - Compact Numpad */}
          {paymentMethod === 'cash' && (
            <div className="flex-shrink-0 px-4 pb-2">
              <label htmlFor="payment-amount" className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-1">
                Amount Received
              </label>
              {settings?.useNumPad !== false ? (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      id="payment-amount"
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200 text-right"
                      value={paymentAmount}
                      readOnly
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      className="whitespace-nowrap py-2 px-3 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg"
                      onClick={() => setPaymentAmount(calculateTotal().toString())}
                    >
                      Exact
                    </button>
                  </div>
                  
                  {/* Compact Number Pad */}
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 'C', 4, 5, 6, '⌫', 7, 8, 9, '+', 0, '00', '.', '='].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        className={`py-2 ${
                          btn === 'C' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' 
                            : btn === '=' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                            : btn === '+' || btn === '⌫'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                            : 'bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 hover:bg-gray-100 dark:hover:bg-dark-500 text-dark-800 dark:text-white'
                        } rounded-lg transition-colors duration-150 font-medium text-lg`}
                        onClick={() => {
                          if (btn === 'C') {
                            setPaymentAmount('');
                          } else if (btn === '⌫') {
                            setPaymentAmount((prev) => prev.slice(0, -1));
                          } else if (btn === '=') {
                            setPaymentAmount(calculateTotal().toString());
                          } else if (btn === '+') {
                            const currentAmount = parseFloat(paymentAmount) || 0;
                            const total = calculateTotal();
                            if (currentAmount < total) {
                              setPaymentAmount(total.toString());
                            }
                          } else if (btn === '.') {
                            if (!paymentAmount.includes('.')) {
                              setPaymentAmount((prev) => prev + '.');
                            }
                          } else {
                            setPaymentAmount((prev) => prev + btn.toString());
                          }
                        }}
                      >
                        {btn === '⌫' ? <IconBackspace size={18} className="mx-auto" /> : btn}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="block w-full py-2.5 px-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap py-2.5 px-3 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg"
                    onClick={() => setPaymentAmount(calculateTotal().toString())}
                  >
                    Exact
                  </button>
                </div>
              )}
              
              {/* Show change calculation when valid amount is entered */}
              {paymentAmount && parseFloat(paymentAmount) >= calculateTotal() && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                  Change: {formatCurrency(calculateChange())}
                </div>
              )}
            </div>
          )}
          
          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < calculateTotal()))}
            className={`flex-shrink-0 w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors duration-150 ${
              cart.length === 0 || isProcessing || (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < calculateTotal()))
                ? 'bg-gray-300 dark:bg-dark-500 text-dark-500 dark:text-dark-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <IconReceiptTax size={18} className="mr-2" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-dark-900/75 flex items-center justify-center z-40 animate-fade-in">
          <div className="bg-white dark:bg-dark-700 rounded-xl shadow-hard dark:shadow-xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-display font-semibold text-dark-800 dark:text-white">Apply Discount</h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-dark-400 dark:text-dark-300 hover:text-dark-600 dark:hover:text-dark-100 focus:outline-none transition-colors duration-150"
              >
                <IconX size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex space-x-3 mb-3">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-lg text-center transition-colors duration-150 ${
                      discountType === 'percentage'
                        ? 'bg-primary-500 dark:bg-primary-600 text-white'
                        : 'bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 text-dark-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-500'
                    }`}
                    onClick={() => setDiscountType('percentage')}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-lg text-center transition-colors duration-150 ${
                      discountType === 'flat'
                        ? 'bg-primary-500 dark:bg-primary-600 text-white'
                        : 'bg-white dark:bg-dark-600 border border-gray-200 dark:border-dark-500 text-dark-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-500'
                    }`}
                    onClick={() => setDiscountType('flat')}
                  >
                    Flat Amount
                  </button>
                </div>
                
                <div>
                  <label htmlFor="discount-value" className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-2">
                    {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                  </label>
                  <div className="relative">
                    <input
                      id="discount-value"
                      type="number"
                      min="0"
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      max={discountType === 'percentage' ? '100' : ''}
                      className="block w-full py-2.5 px-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                    />
                    {discountType === 'percentage' && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                        %
                      </div>
                    )}
                    {discountType === 'flat' && (
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                        {settings?.currency || 'MAD'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Quick discount buttons for percentage */}
              {discountType === 'percentage' && (
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map(percent => (
                    <button
                      key={percent}
                      type="button"
                      className="py-2 bg-gray-100 dark:bg-dark-600 hover:bg-gray-200 dark:hover:bg-dark-500 text-dark-700 dark:text-dark-200 rounded-lg transition-colors duration-150"
                      onClick={() => setDiscountValue(percent.toString())}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 text-dark-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-500 rounded-lg transition-colors duration-150"
                  onClick={() => {
                    setDiscountValue('');
                    setDiscount(0);
                    setShowDiscountModal(false);
                  }}
                >
                  Remove Discount
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white rounded-lg transition-colors duration-150"
                  onClick={handleApplyDiscount}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-dark-900/75 flex items-center justify-center z-40 animate-fade-in">
          <div className="bg-white dark:bg-dark-700 rounded-xl shadow-hard dark:shadow-xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-display font-semibold text-dark-800 dark:text-white">Scan Barcode</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-dark-400 dark:text-dark-300 hover:text-dark-600 dark:hover:text-dark-100 focus:outline-none transition-colors duration-150"
              >
                <IconX size={24} />
              </button>
            </div>
            <QRCodeScanner 
              onDetected={handleBarcodeDetected} 
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-medium animate-slide-up z-50 ${
          notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-primary-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
      
      {/* Receipt Modal */}
      {showReceiptModal && currentTransaction && Object.keys(currentTransaction).length > 0 && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          transactionData={currentTransaction}
          businessInfo={{
            businessName: settings?.businessName || 'Electron POS',
            address: settings?.address || '',
            phone: settings?.phone || '',
            employee: settings?.defaultEmployee || 'Cashier'
          }}
        />
      )}
    </div>
  );
};

export default POS; 