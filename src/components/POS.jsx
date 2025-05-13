import React, { useState, useEffect, useRef } from 'react';
import ReceiptModal from './POS/ReceiptModal';
import BarcodeScanner from './BarcodeScanner';
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
  IconReceiptTax
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

  // Handle barcode detection from scanner
  const handleBarcodeDetected = (barcode) => {
    if (!barcode) return;
    
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      // Check if product is in stock before adding
      if (product.stock <= 0) {
        showNotification(`${product.name} is out of stock`, 'error');
      } else {
        addToCart(product);
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
    
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      // Check if product is in stock before adding
      if (product.stock <= 0) {
        showNotification(`${product.name} is out of stock`, 'error');
      } else {
        addToCart(product);
      }
      e.target.barcode.value = '';
    } else {
      showNotification(`Product with barcode ${barcode} not found`, 'error');
    }
  };

  const addToCart = (product) => {
    // Get the effective stock (current stock minus what's already in cart)
    const effectiveStock = getEffectiveStock(product);
    
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
        product.barcode.includes(searchTerm);
      
      return matchesCategory && matchesSearch;
    });
  };

  const getEffectiveStock = (product) => {
    // Find the product in cart if it exists
    const cartItem = cart.find(item => item._id === product._id);
    // Calculate real-time effective stock by subtracting cart quantity
    return cartItem ? Math.max(0, product.stock - cartItem.quantity) : product.stock;
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
      
      // Store transaction data for the receipt modal
      setCurrentTransaction({
        ...transaction,
        receiptId: result._id || 'INV000000',
      });
      
      // Show receipt modal
      setShowReceiptModal(true);
      
      // Clear cart after successful transaction
      clearCart();
      showNotification('Transaction completed successfully', 'success');
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
    <div className="h-full flex flex-col md:flex-row animate-fade-in overflow-hidden">
      {/* Left Side - Product List & Categories */}
      <div className="w-full md:w-3/5 flex flex-col h-full overflow-hidden">
        {/* Search & Barcode Scanner */}
        <div className="p-4 bg-white dark:bg-dark-700 shadow dark:shadow-none rounded-xl mb-4 transition-colors duration-200">
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
        
        {/* Category Filter */}
        <div className="px-4 mb-4 flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
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
        
        {/* Products Grid */}
        <div className="flex-grow overflow-y-auto px-4 pb-4">
          {getFilteredProducts().length === 0 ? (
            <div className="text-center py-16 text-dark-500 dark:text-dark-300">
              <IconSearch size={48} className="mx-auto mb-4 text-dark-300 dark:text-dark-500" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try searching for something else or selecting a different category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {getFilteredProducts().map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg shadow-soft dark:shadow-none overflow-hidden transition-all duration-150 ${
                    product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-300 dark:hover:border-primary-500 hover:-translate-y-1 hover:shadow-medium'
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
                      product.stock <= 0 
                        ? 'bg-red-600 text-white' 
                        : product.stock <= (settings?.lowStockThreshold || 5) 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-green-600 text-white'
                    }`}>
                      Stock: {product.stock}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Right Side - Cart */}
      <div className="w-full md:w-2/5 flex flex-col h-full md:ml-4 mt-4 md:mt-0">
        <div className="bg-white dark:bg-dark-700 shadow-soft dark:shadow-none rounded-xl flex flex-col h-full overflow-hidden transition-colors duration-200">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-600 flex justify-between items-center">
            <h2 className="text-lg font-display font-semibold text-dark-800 dark:text-white flex items-center">
              <IconShoppingCart size={20} className="mr-2 text-primary-500 dark:text-primary-400" />
              Current Cart
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
          
          {/* Cart Items */}
          <div className="flex-grow overflow-y-auto p-4 border-b border-gray-200 dark:border-dark-600">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-dark-500 dark:text-dark-300">
                <div className="rounded-full bg-primary-50 dark:bg-primary-900/20 p-3 mb-3">
                  <IconShoppingCart size={24} className="text-primary-500 dark:text-primary-400" />
                </div>
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Add products by scanning or clicking on them</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {cart.map(item => (
                  <li key={item._id} className="bg-gray-50 dark:bg-dark-600 rounded-lg p-3 flex items-center justify-between transition-colors duration-150">
                    <div className="flex-grow mr-3">
                      <p className="font-medium text-dark-800 dark:text-white">{item.name}</p>
                      <p className="text-sm text-dark-500 dark:text-dark-300">{formatCurrency(item.price)} × {item.quantity}</p>
                    </div>
                    <div className="text-right">
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
          
          {/* Cart Summary */}
          <div className="p-4">
            <div className="mb-4 space-y-2">
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
              
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-dark-500">
                <span className="text-dark-800 dark:text-white font-bold">Total:</span>
                <span className="text-dark-800 dark:text-white font-bold">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            
            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-2">Payment Method</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center transition-colors duration-150 ${
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
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center transition-colors duration-150 ${
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
            </div>
            
            {/* Cash payment input (only show for cash payments) */}
            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label htmlFor="payment-amount" className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-2">
                  Amount Received
                </label>
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
              className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors duration-150 ${
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
            <BarcodeScanner onDetected={handleBarcodeDetected} />
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
      {showReceiptModal && currentTransaction && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          transactionData={{
            ...currentTransaction,
            receiptId: currentTransaction._id
          }}
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