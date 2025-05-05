import React, { useState, useEffect } from 'react';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const data = await window.api.transactions.getTransactions();
        // Sort by date, newest first
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(sorted);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleViewDetails = async (id) => {
    try {
      const transaction = await window.api.transactions.getTransactionById(id);
      setSelectedTransaction(transaction);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    }
  };

  const handlePrintReceipt = async (transaction) => {
    try {
      // Get business settings
      const settings = await window.api.settings.getSettings();
      
      // Prepare receipt data
      const receiptData = {
        businessName: settings.businessName || 'My POS Store',
        address: settings.address || '',
        phone: settings.phone || '',
        receiptId: transaction._id,
        date: new Date(transaction.date).toLocaleString(),
        items: transaction.items,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        paymentAmount: transaction.paymentAmount,
        change: transaction.change,
        footer: settings.receiptFooter || 'Thank you for your business!'
      };
      
      // Print receipt
      await window.api.print.printReceipt(receiptData);
    } catch (error) {
      console.error('Error printing receipt:', error);
    }
  };

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      
      {/* Transactions List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow p-6">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-gray-500">No transactions yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map(tx => (
                <tr key={tx._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx._id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.items?.length || 0} items</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(tx.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tx.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(tx._id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handlePrintReceipt(tx)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Transaction Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <div className="text-sm text-gray-500">Transaction ID:</div>
                <div className="text-sm font-medium">{selectedTransaction._id}</div>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <div className="text-sm text-gray-500">Date:</div>
                <div className="text-sm font-medium">{formatDate(selectedTransaction.date)}</div>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <div className="text-sm text-gray-500">Payment Method:</div>
                <div className="text-sm font-medium capitalize">{selectedTransaction.paymentMethod}</div>
              </div>
              
              <div>
                <div className="font-medium mb-2">Items:</div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedTransaction.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.price)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between py-1">
                  <div className="text-sm text-gray-500">Subtotal:</div>
                  <div className="text-sm font-medium">{formatCurrency(selectedTransaction.subtotal)}</div>
                </div>
                <div className="flex justify-between py-1">
                  <div className="text-sm text-gray-500">Tax:</div>
                  <div className="text-sm font-medium">{formatCurrency(selectedTransaction.tax)}</div>
                </div>
                <div className="flex justify-between py-1 text-lg font-bold">
                  <div>Total:</div>
                  <div>{formatCurrency(selectedTransaction.total)}</div>
                </div>
                
                {selectedTransaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between py-1">
                      <div className="text-sm text-gray-500">Amount Received:</div>
                      <div className="text-sm font-medium">{formatCurrency(selectedTransaction.paymentAmount)}</div>
                    </div>
                    <div className="flex justify-between py-1">
                      <div className="text-sm text-gray-500">Change:</div>
                      <div className="text-sm font-medium">{formatCurrency(selectedTransaction.change)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handlePrintReceipt(selectedTransaction)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions; 