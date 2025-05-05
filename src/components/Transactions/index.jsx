import React, { useState, useEffect } from 'react';
import ReceiptModal from '../POS/ReceiptModal';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [settings, setSettings] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedTransactions, setPaginatedTransactions] = useState([]);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch transactions
        const data = await window.api.transactions.getTransactions();
        // Sort by date, newest first
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(sorted);
        setFilteredTransactions(sorted);
        
        // Calculate total pages
        setTotalPages(Math.ceil(sorted.length / itemsPerPage));
        
        // Fetch settings
        const settingsData = await window.api.settings.getSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [itemsPerPage]);
  
  // Filter transactions based on search term and filters
  useEffect(() => {
    if (transactions.length > 0) {
      let results = [...transactions];
      
      // Apply search term filter
      if (searchTerm.trim() !== '') {
        const search = searchTerm.toLowerCase();
        results = results.filter(tx => 
          tx._id.toLowerCase().includes(search) || 
          tx.items.some(item => item.name.toLowerCase().includes(search))
        );
      }
      
      // Apply payment method filter
      if (filterPaymentMethod !== 'all') {
        results = results.filter(tx => tx.paymentMethod === filterPaymentMethod);
      }
      
      // Apply date range filter
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        results = results.filter(tx => new Date(tx.date) >= startDate);
      }
      
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        results = results.filter(tx => new Date(tx.date) <= endDate);
      }
      
      setFilteredTransactions(results);
      setTotalPages(Math.ceil(results.length / itemsPerPage));
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [transactions, searchTerm, filterPaymentMethod, dateRange]);
  
  // Update paginated transactions when relevant state changes
  useEffect(() => {
    if (filteredTransactions.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, filteredTransactions.length);
      setPaginatedTransactions(filteredTransactions.slice(startIndex, endIndex));
    } else {
      setPaginatedTransactions([]);
    }
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings?.currency || 'MAD'
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

  const handleShowReceipt = (transaction) => {
    // Close details modal when showing receipt
    if (showDetails) {
      setShowDetails(false);
    }
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };
  
  const handlePageChange = (page) => {
    // Ensure page is within bounds
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handlePaymentMethodFilter = (e) => {
    setFilterPaymentMethod(e.target.value);
  };
  
  const handleDateRangeChange = (type, value) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterPaymentMethod('all');
    setDateRange({ start: '', end: '' });
  };
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5; // Number of page buttons to show
    
    if (totalPages <= maxPageButtons) {
      // Show all pages if total pages is less than maxPageButtons
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Complex pagination with ellipsis
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Middle
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search input */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Payment method filter */}
          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              id="payment-method"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full py-2 px-3 border border-gray-300 rounded-md"
              value={filterPaymentMethod}
              onChange={handlePaymentMethodFilter}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          
          {/* From date filter */}
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <div className="relative">
              <input
                type="date"
                id="date-from"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 py-2 px-3 border border-gray-300 rounded-md"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* To date filter */}
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <div className="relative">
              <input
                type="date"
                id="date-to"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 py-2 px-3 border border-gray-300 rounded-md"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Clear Filters button - moved outside the grid for better positioning */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Transactions List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading transactions...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow p-6">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-gray-500">No transactions found</p>
          {(searchTerm || filterPaymentMethod !== 'all' || dateRange.start || dateRange.end) && (
            <p className="mt-1 text-gray-500">Try adjusting your filters</p>
          )}
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
              {paginatedTransactions.map(tx => (
                <tr key={tx._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[150px]">{tx._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.items?.length || 0} items</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(tx.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tx.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(tx._id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between items-center">
              {/* Items per page selector */}
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">
                  Show
                </span>
                <select 
                  value={itemsPerPage} 
                  onChange={handleItemsPerPageChange}
                  className="border border-gray-300 rounded-md text-sm px-2 py-1"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700 ml-2">
                  per page
                </span>
              </div>
              
              {/* Pagination info */}
              <div className="hidden sm:block">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredTransactions.length}</span> results
                </p>
              </div>
              
              {/* Pagination buttons */}
              <div className="flex items-center space-x-2">
                {/* Previous page button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                      {page === '...' ? (
                        <span className="px-3 py-1 text-sm text-gray-700">...</span>
                      ) : (
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            currentPage === page
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                
                {/* Next page button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Transaction Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-red-500 hover:text-red-700"
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
                onClick={() => handleShowReceipt(selectedTransaction)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Show Receipt
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Receipt Modal - with higher z-index to ensure it appears on top */}
      {showReceiptModal && selectedTransaction && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          transactionData={{
            ...selectedTransaction,
            receiptId: selectedTransaction._id
          }}
          businessInfo={{
            businessName: settings?.businessName || 'My POS Store',
            address: settings?.address || '',
            phone: settings?.phone || '',
            employee: settings?.defaultEmployee || 'Cashier'
          }}
        />
      )}
    </div>
  );
};

export default Transactions; 