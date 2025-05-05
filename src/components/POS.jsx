import React, { useState, useEffect, useRef } from 'react';
import ReceiptModal from './POS/ReceiptModal';

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
      
      {/* Receipt Modal */}
      <ReceiptModal 
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transactionData={currentTransaction}
        businessInfo={{
          businessName: settings?.businessName || 'My POS Store',
          address: settings?.address || '',
          phone: settings?.phone || '',
          employee: settings?.defaultEmployee || 'Cashier'
        }}
      />
      
      {/* Product Selection */}
      <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
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
          {getFilteredProducts().map(product => {
            // Calculate effective stock for display
            const effectiveStock = getEffectiveStock(product);
            
            return (
              <div 
                key={product._id}
                onClick={() => addToCart(product)}
                className={`bg-white border ${effectiveStock <= 0 ? 'border-red-300 opacity-60' : 'border-gray-200'} rounded-md p-2 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors`}
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
                  {effectiveStock <= 0 ? (
                    <div className="text-xs mt-1 bg-red-600 text-white px-2 py-0.5 rounded font-medium" style={{display: 'inline-block'}}>
                      Out of stock
                    </div>
                  ) : effectiveStock < (settings?.lowStockThreshold || 5) ? (
                    <div className="text-xs mt-1" style={{backgroundColor: '#FBBF24', color: '#000000', padding: '2px 8px', borderRadius: '9999px', display: 'inline-block', fontWeight: '500'}}>
                      Stock: {effectiveStock}
                    </div>
                  ) : (
                    <div className="text-xs mt-1" style={{backgroundColor: '#34D399', color: '#000000', padding: '2px 8px', borderRadius: '9999px', display: 'inline-block', fontWeight: '500'}}>
                      Stock: {effectiveStock}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Cart */}
      <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-10rem)] flex flex-col">
        <h2 className="text-lg font-medium mb-3">Current Order</h2>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto mb-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="mt-2">Cart is empty</p>
              <p className="text-sm">Add products by scanning or clicking on them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item._id} className="flex justify-between items-center border-b pb-2">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                    <div className="flex items-center border rounded">
                      <button 
                        onClick={() => updateCartItemQuantity(item._id, item.quantity - 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-2">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartItemQuantity(item._id, item.quantity + 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item._id)}
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
        
        {/* Totals */}
        <div className="border-t pt-3">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal:</span>
            <span>{formatCurrency(calculateSubtotal())}</span>
          </div>
          
          {/* Discount display */}
          {discount > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">
                Discount {discountType === 'percentage' ? `(${discount}%)` : ''}:
              </span>
              <span className="text-red-500">-{formatCurrency(calculateDiscount())}</span>
            </div>
          )}
          
          {/* Tax display - only show if tax is enabled */}
          {settings?.taxType !== 'disabled' && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">
                {settings?.taxName || 'Tax'} ({settings?.taxRate || 0}%){settings?.taxType === 'included' ? ' (Included)' : ''}:
              </span>
              <span>{formatCurrency(calculateTax())}</span>
            </div>
          )}
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          
          {/* Discount Button */}
          <div className="mt-2 mb-2">
            <button
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
              className={`w-full py-1 rounded-md text-sm bg-purple-500 text-white hover:bg-purple-600 ${
                cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {discount > 0 
                ? `Modify Discount (${discountType === 'percentage' ? `${discount}%` : formatCurrency(discount)})` 
                : 'Apply Discount'}
            </button>
          </div>
          
          {/* Payment */}
          <div className="space-y-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2 rounded-md text-sm ${
                    paymentMethod === 'cash' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2 rounded-md text-sm ${
                    paymentMethod === 'card' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Card
                </button>
              </div>
            </div>
            
            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Received
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                    {settings?.currency || 'MAD'}
                  </span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 border border-gray-300 p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {paymentAmount && parseFloat(paymentAmount) >= calculateTotal() && (
                  <div className="text-sm mt-1">
                    <span>Change: </span>
                    <span className="font-medium">{formatCurrency(calculateChange())}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0 || isProcessing}
              className={`flex-1 py-2 rounded-md text-white bg-red-500 hover:bg-red-600 ${
                (cart.length === 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Clear
            </button>
            <button
              onClick={handleCheckout}
              disabled={
                cart.length === 0 || 
                isProcessing || 
                (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < calculateTotal()))
              }
              className={`flex-1 py-2 rounded-md text-white bg-green-500 hover:bg-green-600 ${
                (cart.length === 0 || 
                isProcessing || 
                (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < calculateTotal())))
                  ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Apply Discount</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Type
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 py-2 rounded-md text-sm ${
                    discountType === 'percentage' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  onClick={() => setDiscountType('flat')}
                  className={`flex-1 py-2 rounded-md text-sm ${
                    discountType === 'flat' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Flat Amount
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {discountType === 'percentage' ? 'Percentage (%)' : 'Amount'}
              </label>
              <div className="flex">
                {discountType === 'flat' && (
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                    {settings?.currency || 'MAD'}
                  </span>
                )}
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? "10" : "50.00"}
                  min="0"
                  max={discountType === 'percentage' ? "100" : ""}
                  step={discountType === 'percentage' ? "1" : "0.01"}
                  className={`flex-1 border border-gray-300 p-2 ${
                    discountType === 'flat' ? 'rounded-r-md' : 'rounded-md'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {discountType === 'percentage' && (
                  <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                    %
                  </span>
                )}
              </div>
            </div>
            
            {/* Preview */}
            {discountValue && parseFloat(discountValue) > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700 mb-1">Discount preview:</p>
                <p className="text-sm">
                  <span className="font-medium">Subtotal:</span> {formatCurrency(calculateSubtotal())}
                </p>
                <p className="text-sm text-red-500">
                  <span className="font-medium">Discount:</span> -{formatCurrency(
                    discountType === 'percentage' 
                      ? calculateSubtotal() * (parseFloat(discountValue) / 100)
                      : parseFloat(discountValue)
                  )}
                </p>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setDiscountValue('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS; 