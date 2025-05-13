import React, { useState, useEffect } from 'react';
import ReceiptModal from '../POS/ReceiptModal';
import {
  IconSearch,
  IconCalendar,
  IconReceipt,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconFilter
} from '@tabler/icons-react';

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

  // Update the loading state to match dark mode theme
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse-slow text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
            <div className="w-10 h-10 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-dark-500 dark:text-dark-300">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6 text-dark-800 dark:text-white">Transactions</h1>
      
      {/* Search and Filters */}
      <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-5 mb-6 transition-colors duration-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search input */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-dark-700 dark:text-dark-200 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconSearch size={18} />
              </div>
            </div>
          </div>
          
          {/* Payment method filter */}
          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-dark-700 dark:text-dark-200 mb-2">Payment Method</label>
            <select
              id="payment-method"
              className="block w-full py-2.5 px-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
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
            <label htmlFor="date-from" className="block text-sm font-medium text-dark-700 dark:text-dark-200 mb-2">From</label>
            <div className="relative">
              <input
                type="date"
                id="date-from"
                className="block w-full pr-10 py-2.5 px-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconCalendar size={18} />
              </div>
            </div>
          </div>
          
          {/* To date filter */}
          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-dark-700 dark:text-dark-200 mb-2">To</label>
            <div className="relative">
              <input
                type="date"
                id="date-to"
                className="block w-full pr-10 py-2.5 px-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconCalendar size={18} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Clear Filters button - moved outside the grid for better positioning */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 dark:bg-dark-600 text-dark-700 dark:text-dark-200 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-500 focus:outline-none transition-colors duration-200 flex items-center"
          >
            <IconFilter size={16} className="mr-1.5" /> Clear Filters
          </button>
        </div>
      </div>
      
      {/* Transactions List */}
      {filteredTransactions.length === 0 && !isLoading ? (
        <div className="text-center py-8 bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-6 transition-colors duration-200">
          <IconReceipt size={48} className="mx-auto text-dark-300 dark:text-dark-500" />
          <p className="mt-2 text-dark-500 dark:text-dark-300">No transactions found</p>
          {(searchTerm || filterPaymentMethod !== 'all' || dateRange.start || dateRange.end) && (
            <p className="mt-1 text-dark-500 dark:text-dark-300">Try adjusting your filters</p>
          )}
        </div>
      ) : !isLoading && (
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none overflow-hidden transition-colors duration-200">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
            <thead className="bg-gray-50 dark:bg-dark-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
              {paginatedTransactions.map(tx => (
                <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors duration-150">
                  <td className="px-6 py-4 text-sm text-dark-500 dark:text-dark-300 truncate max-w-[150px] font-mono">{tx._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300">{formatDate(tx.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300">{tx.items?.length || 0} items</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-800 dark:text-white">{formatCurrency(tx.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300 capitalize">{tx.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(tx._id)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-150"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="bg-white dark:bg-dark-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-dark-600 transition-colors duration-200">
            <div className="flex-1 flex justify-between items-center">
              {/* Items per page selector */}
              <div className="flex items-center">
                <span className="text-sm text-dark-500 dark:text-dark-300 mr-2">
                  Show
                </span>
                <select 
                  value={itemsPerPage} 
                  onChange={handleItemsPerPageChange}
                  className="border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 text-dark-800 dark:text-white rounded-lg text-sm px-2 py-1 transition-colors duration-150"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-dark-500 dark:text-dark-300 ml-2">
                  per page
                </span>
              </div>
              
              {/* Pagination info */}
              <div className="hidden sm:block">
                <p className="text-sm text-dark-500 dark:text-dark-300">
                  Showing <span className="font-medium text-dark-700 dark:text-dark-200">{filteredTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
                  <span className="font-medium text-dark-700 dark:text-dark-200">
                    {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                  </span>{' '}
                  of <span className="font-medium text-dark-700 dark:text-dark-200">{filteredTransactions.length}</span> results
                </p>
              </div>
              
              {/* Pagination buttons */}
              <div className="flex items-center space-x-2">
                {/* Previous page button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    currentPage === 1
                      ? 'text-dark-300 dark:text-dark-500 cursor-not-allowed'
                      : 'text-dark-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-600'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <IconChevronLeft size={18} />
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                      {page === '...' ? (
                        <span className="px-3 py-1 text-sm text-dark-500 dark:text-dark-300">...</span>
                      ) : (
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 rounded-md text-sm transition-colors duration-150 ${
                            currentPage === page
                              ? 'bg-primary-500 dark:bg-primary-600 text-white'
                              : 'text-dark-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-600'
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
                  className={`relative inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    currentPage === totalPages
                      ? 'text-dark-300 dark:text-dark-500 cursor-not-allowed'
                      : 'text-dark-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-600'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <IconChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-dark-900/75 flex items-center justify-center z-40 animate-fade-in">
          <div className="bg-white dark:bg-dark-700 rounded-xl shadow-hard dark:shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-display font-semibold text-dark-800 dark:text-white">Transaction Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-dark-400 dark:text-dark-300 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-150"
              >
                <IconX size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-200 dark:border-dark-600 pb-3">
                <div className="text-sm text-dark-500 dark:text-dark-300">Transaction ID:</div>
                <div className="text-sm font-medium text-dark-700 dark:text-dark-100 font-mono">{selectedTransaction._id}</div>
              </div>
              
              <div className="flex justify-between border-b border-gray-200 dark:border-dark-600 pb-3">
                <div className="text-sm text-dark-500 dark:text-dark-300">Date:</div>
                <div className="text-sm font-medium text-dark-700 dark:text-dark-100">{formatDate(selectedTransaction.date)}</div>
              </div>
              
              <div className="flex justify-between border-b border-gray-200 dark:border-dark-600 pb-3">
                <div className="text-sm text-dark-500 dark:text-dark-300">Payment Method:</div>
                <div className="text-sm font-medium text-dark-700 dark:text-dark-100 capitalize">{selectedTransaction.paymentMethod}</div>
              </div>
              
              <div>
                <div className="font-medium mb-3 text-dark-700 dark:text-dark-100">Items:</div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
                  <thead className="bg-gray-50 dark:bg-dark-600">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Item</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
                    {selectedTransaction.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-dark-700 dark:text-dark-100">{item.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300">{item.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300">{formatCurrency(item.price)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-dark-700 dark:text-dark-100 text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t border-gray-200 dark:border-dark-600 pt-3">
                <div className="flex justify-between py-1">
                  <div className="text-sm text-dark-500 dark:text-dark-300">Subtotal:</div>
                  <div className="text-sm font-medium text-dark-700 dark:text-dark-100">{formatCurrency(selectedTransaction.subtotal)}</div>
                </div>
                <div className="flex justify-between py-1">
                  <div className="text-sm text-dark-500 dark:text-dark-300">Tax:</div>
                  <div className="text-sm font-medium text-dark-700 dark:text-dark-100">{formatCurrency(selectedTransaction.tax)}</div>
                </div>
                <div className="flex justify-between py-1 text-lg font-bold">
                  <div className="text-dark-800 dark:text-white">Total:</div>
                  <div className="text-dark-800 dark:text-white">{formatCurrency(selectedTransaction.total)}</div>
                </div>
                
                {selectedTransaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between py-1">
                      <div className="text-sm text-dark-500 dark:text-dark-300">Amount Received:</div>
                      <div className="text-sm font-medium text-dark-700 dark:text-dark-100">{formatCurrency(selectedTransaction.paymentAmount)}</div>
                    </div>
                    <div className="flex justify-between py-1">
                      <div className="text-sm text-dark-500 dark:text-dark-300">Change:</div>
                      <div className="text-sm font-medium text-dark-700 dark:text-dark-100">{formatCurrency(selectedTransaction.change)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleShowReceipt(selectedTransaction)}
                className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white px-4 py-2 rounded-lg shadow-sm transition-colors duration-150"
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