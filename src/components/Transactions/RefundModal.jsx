import React, { useState, useEffect } from 'react';
import { 
  IconX, 
  IconSearch, 
  IconReceipt, 
  IconCheck, 
  IconAlertTriangle,
  IconPackageOff,
  IconPackage
} from '@tabler/icons-react';

const RefundModal = ({ isOpen, onClose, onRefundComplete, businessInfo, transaction: initialTransaction }) => {
  const [receiptId, setReceiptId] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('search'); // search, review, confirm, success
  const [itemsToRefund, setItemsToRefund] = useState([]);
  const [returnToStock, setReturnToStock] = useState({});
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      // If a transaction is provided, pre-fill the receipt ID and skip to review
      if (initialTransaction) {
        setReceiptId(initialTransaction.receiptId || '');
        setTransaction(initialTransaction);
        
        // Initialize items to refund with all items from the transaction
        const initialItemsToRefund = initialTransaction.items.map(item => ({
          ...item,
          maxQuantity: item.quantity // Save original quantity as max
        }));
        setItemsToRefund(initialItemsToRefund);
        
        // Initialize returnToStock state
        const initialReturnToStock = {};
        initialTransaction.items.forEach(item => {
          initialReturnToStock[item._id] = true;
        });
        setReturnToStock(initialReturnToStock);
        
        setStep('review');
      } else {
        // Reset all state if no transaction provided
        setReceiptId('');
        setTransaction(null);
        setStep('search');
        setItemsToRefund([]);
        setReturnToStock({});
      }
      
      setLoading(false);
      setError('');
      setRefundReason('');
      setRefundAmount(0);
    }
  }, [isOpen, initialTransaction]);

  // Calculate refund amount when items to refund change
  useEffect(() => {
    if (transaction && itemsToRefund.length > 0) {
      let amount = 0;
      itemsToRefund.forEach(item => {
        // Find the original item in the transaction
        const originalItem = transaction.items.find(i => i._id === item._id);
        if (originalItem) {
          // Calculate item total with quantity
          amount += originalItem.price * item.quantity;
        }
      });

      // Apply tax if applicable
      if (transaction.taxType === 'added' && transaction.taxRate > 0) {
        amount += amount * (transaction.taxRate / 100);
      }

      setRefundAmount(parseFloat(amount.toFixed(2)));
    } else {
      setRefundAmount(0);
    }
  }, [itemsToRefund, transaction]);

  const handleSearchReceipt = async () => {
    if (!receiptId.trim()) {
      setError('Please enter a receipt ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Search for transaction by receipt ID
      const result = await window.api.transactions.getTransactionByReceiptId(receiptId);
      
      if (!result) {
        setError('Receipt not found');
        setTransaction(null);
      } else if (result.refunded) {
        setError('This transaction has already been refunded');
        setTransaction(null);
      } else {
        setTransaction(result);
        
        // Initialize items to refund with all items from the transaction
        const initialItemsToRefund = result.items.map(item => ({
          ...item,
          maxQuantity: item.quantity // Save original quantity as max
        }));
        setItemsToRefund(initialItemsToRefund);
        
        // Initialize returnToStock state
        const initialReturnToStock = {};
        result.items.forEach(item => {
          initialReturnToStock[item._id] = true;
        });
        setReturnToStock(initialReturnToStock);
        
        setStep('review');
      }
    } catch (error) {
      console.error('Error searching for receipt:', error);
      setError('An error occurred while searching for the receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    setItemsToRefund(prev => 
      prev.map(item => {
        if (item._id === itemId) {
          // Ensure quantity is within valid range
          const quantity = Math.max(0, Math.min(newQuantity, item.maxQuantity));
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const handleReturnToStockChange = (itemId, value) => {
    setReturnToStock(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleRefund = async () => {
    // Filter out items with quantity 0
    const itemsToProcess = itemsToRefund.filter(item => item.quantity > 0);
    
    if (itemsToProcess.length === 0) {
      setError('Please select at least one item to refund');
      return;
    }

    if (!refundReason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create refund data
      const refundData = {
        originalTransactionId: transaction._id,
        receiptId: transaction.receiptId,
        items: itemsToProcess,
        returnToStock,
        refundReason,
        refundAmount,
        refundDate: new Date().toISOString(),
        paymentMethod: transaction.paymentMethod
      };

      // Process refund
      const result = await window.api.transactions.processRefund(refundData);
      
      if (result.success) {
        setStep('success');
        // Call the onRefundComplete callback to refresh transaction list
        if (onRefundComplete) {
          onRefundComplete();
        }
      } else {
        setError(result.message || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      setError('An error occurred while processing the refund');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: businessInfo?.currency || 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-600 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-dark-800 dark:text-white flex items-center">
            <IconReceipt size={24} className="mr-2 text-primary-500 dark:text-primary-400" />
            Process Refund
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors duration-150"
            aria-label="Close"
          >
            <IconX size={24} className="text-gray-500 dark:text-dark-300" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          {step === 'search' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="receiptId" className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                  Enter Receipt ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="receiptId"
                    value={receiptId}
                    onChange={(e) => setReceiptId(e.target.value)}
                    placeholder="e.g., INV000123"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-dark-500 rounded-md shadow-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconSearch size={18} className="text-gray-500 dark:text-dark-300" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-300">
                  Enter the receipt ID to find the transaction you want to refund
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'review' && transaction && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-dark-600/30 p-4 rounded-md">
                <h3 className="text-md font-medium text-dark-800 dark:text-white mb-2">Transaction Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600 dark:text-dark-300">Receipt ID:</div>
                  <div className="text-dark-800 dark:text-white font-medium">{transaction.receiptId}</div>
                  <div className="text-gray-600 dark:text-dark-300">Date:</div>
                  <div className="text-dark-800 dark:text-white">{formatDate(transaction.date)}</div>
                  <div className="text-gray-600 dark:text-dark-300">Payment Method:</div>
                  <div className="text-dark-800 dark:text-white capitalize">{transaction.paymentMethod}</div>
                  <div className="text-gray-600 dark:text-dark-300">Total Amount:</div>
                  <div className="text-dark-800 dark:text-white">{formatCurrency(transaction.total)}</div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-dark-800 dark:text-white mb-2">Select Items to Refund</h3>
                <div className="border border-gray-200 dark:border-dark-500 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-500">
                    <thead className="bg-gray-50 dark:bg-dark-600/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                          Return to Stock
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-500">
                      {itemsToRefund.map((item) => (
                        <tr key={item._id}>
                          <td className="px-4 py-3 text-sm text-dark-800 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-800 dark:text-white text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                                className="p-1 rounded-md bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-dark-300 hover:bg-gray-200 dark:hover:bg-dark-500"
                                disabled={item.quantity <= 0}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={item.maxQuantity}
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item._id, parseInt(e.target.value) || 0)}
                                className="w-12 mx-2 text-center border border-gray-300 dark:border-dark-500 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                                className="p-1 rounded-md bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-dark-300 hover:bg-gray-200 dark:hover:bg-dark-500"
                                disabled={item.quantity >= item.maxQuantity}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleReturnToStockChange(item._id, !returnToStock[item._id])}
                                className={`p-2 rounded-md ${
                                  returnToStock[item._id]
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                }`}
                                title={returnToStock[item._id] ? "Return to stock" : "Do not return to stock"}
                              >
                                {returnToStock[item._id] ? (
                                  <IconPackage size={18} />
                                ) : (
                                  <IconPackageOff size={18} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                  Reason for Refund
                </label>
                <select
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-dark-500 rounded-md shadow-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
                >
                  <option value="">Select reason...</option>
                  <option value="Customer dissatisfaction">Customer dissatisfaction</option>
                  <option value="Defective product">Defective product</option>
                  <option value="Wrong item">Wrong item</option>
                  <option value="Damaged in shipping">Damaged in shipping</option>
                  <option value="Changed mind">Changed mind</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-dark-600/30 p-4 rounded-md">
                <h3 className="text-md font-medium text-dark-800 dark:text-white mb-2">Refund Summary</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-dark-300">Total Refund Amount:</span>
                  <span className="text-xl font-semibold text-dark-800 dark:text-white">
                    {formatCurrency(refundAmount)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <IconCheck size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-dark-800 dark:text-white mb-2">Refund Processed Successfully</h3>
              <p className="text-gray-600 dark:text-dark-300 mb-4">
                The refund for receipt {transaction?.receiptId} has been processed successfully.
              </p>
              <div className="bg-gray-50 dark:bg-dark-600/30 p-4 rounded-md inline-block">
                <div className="text-left">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 dark:text-dark-300">Refund Amount:</span>
                    <span className="text-dark-800 dark:text-white font-medium">{formatCurrency(refundAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-dark-300">Date:</span>
                    <span className="text-dark-800 dark:text-white">{formatDate(new Date())}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-600 flex justify-end space-x-3">
          {step === 'search' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-dark-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-dark-200 bg-white dark:bg-dark-600 hover:bg-gray-50 dark:hover:bg-dark-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSearchReceipt}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  'Search Receipt'
                )}
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                type="button"
                onClick={() => setStep('search')}
                className="px-4 py-2 border border-gray-300 dark:border-dark-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-dark-200 bg-white dark:bg-dark-600 hover:bg-gray-50 dark:hover:bg-dark-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleRefund}
                disabled={loading || itemsToRefund.filter(i => i.quantity > 0).length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Process Refund'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundModal; 