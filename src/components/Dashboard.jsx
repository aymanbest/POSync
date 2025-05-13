import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  IconPackage, 
  IconTag, 
  IconReceipt, 
  IconCoin, 
  IconShoppingCart, 
  IconPlus, 
  IconSettings, 
  IconArrowRight 
} from '@tabler/icons-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    productCount: 0,
    categoryCount: 0,
    transactionCount: 0,
    totalSales: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch products
        const products = await window.api.database.getProducts();
        
        // Fetch categories
        const categories = await window.api.database.getCategories();
        
        // Fetch transactions
        const transactions = await window.api.transactions.getTransactions();
        
        // Fetch settings
        const settingsData = await window.api.settings.getSettings();
        setSettings(settingsData);
        
        // Calculate total sales
        const totalSales = transactions.reduce((sum, tx) => sum + tx.total, 0);
        
        // Set stats
        setStats({
          productCount: products.length,
          categoryCount: categories.length,
          transactionCount: transactions.length,
          totalSales
        });
        
        // Get recent transactions (last 5)
        const sortedTransactions = transactions.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecentTransactions(sortedTransactions.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse-slow text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
            <div className="w-10 h-10 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-dark-500 dark:text-dark-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6 text-dark-800 dark:text-white">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-5 transition-colors duration-200 card-hover">
          <div className="flex items-center">
            <div className="rounded-lg bg-primary-50 dark:bg-primary-900/30 p-3 mr-4">
              <IconPackage className="h-6 w-6 text-primary-500 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-300">Products</p>
              <p className="text-xl font-semibold text-dark-800 dark:text-white">{stats.productCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <NavLink to="/products" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center">
              Manage Products <IconArrowRight size={16} className="ml-1" />
            </NavLink>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-5 transition-colors duration-200 card-hover">
          <div className="flex items-center">
            <div className="rounded-lg bg-secondary-50 dark:bg-secondary-900/30 p-3 mr-4">
              <IconTag className="h-6 w-6 text-secondary-500 dark:text-secondary-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-300">Categories</p>
              <p className="text-xl font-semibold text-dark-800 dark:text-white">{stats.categoryCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <NavLink to="/categories" className="text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 text-sm font-medium flex items-center">
              Manage Categories <IconArrowRight size={16} className="ml-1" />
            </NavLink>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-5 transition-colors duration-200 card-hover">
          <div className="flex items-center">
            <div className="rounded-lg bg-purple-50 dark:bg-purple-900/30 p-3 mr-4">
              <IconReceipt className="h-6 w-6 text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-300">Transactions</p>
              <p className="text-xl font-semibold text-dark-800 dark:text-white">{stats.transactionCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <NavLink to="/transactions" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium flex items-center">
              View Transactions <IconArrowRight size={16} className="ml-1" />
            </NavLink>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-5 transition-colors duration-200 card-hover">
          <div className="flex items-center">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 mr-4">
              <IconCoin className="h-6 w-6 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-300">Total Sales</p>
              <p className="text-xl font-semibold text-dark-800 dark:text-white">{formatCurrency(stats.totalSales)}</p>
            </div>
          </div>
          <div className="mt-4">
            <NavLink to="/pos" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-sm font-medium flex items-center">
              New Sale <IconArrowRight size={16} className="ml-1" />
            </NavLink>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-6 mb-6 transition-colors duration-200">
        <h2 className="text-lg font-display font-semibold mb-4 text-dark-800 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NavLink to="/pos" className="bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-1">
            <IconShoppingCart className="h-8 w-8 mx-auto mb-2" stroke={1.5} />
            <span className="font-medium">New Sale</span>
          </NavLink>
          <NavLink to="/products" className="bg-gradient-to-br from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white rounded-lg p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-1">
            <IconPlus className="h-8 w-8 mx-auto mb-2" stroke={1.5} />
            <span className="font-medium">Add Product</span>
          </NavLink>
          <NavLink to="/categories" className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-1">
            <IconTag className="h-8 w-8 mx-auto mb-2" stroke={1.5} />
            <span className="font-medium">Add Category</span>
          </NavLink>
          <NavLink to="/settings" className="bg-gradient-to-br from-dark-500 to-dark-600 hover:from-dark-600 hover:to-dark-700 text-white rounded-lg p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-1">
            <IconSettings className="h-8 w-8 mx-auto mb-2" stroke={1.5} />
            <span className="font-medium">Settings</span>
          </NavLink>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="bg-white dark:bg-dark-700 rounded-xl shadow-soft dark:shadow-none p-6 transition-colors duration-200">
        <h2 className="text-lg font-display font-semibold mb-4 text-dark-800 dark:text-white">Recent Transactions</h2>
        
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-dark-500 dark:text-dark-300">
            <p>No transactions yet.</p>
            <NavLink to="/pos" className="inline-block mt-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
              Create your first sale
            </NavLink>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-300 uppercase tracking-wider">Payment</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
                {recentTransactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300 font-mono">{tx._id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300">{tx.items.length} items</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-800 dark:text-white">{formatCurrency(tx.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-500 dark:text-dark-300 capitalize">{tx.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-4 text-right">
              <NavLink to="/transactions" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium inline-flex items-center">
                View All Transactions <IconArrowRight size={16} className="ml-1" />
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 