import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

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
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Products</p>
              <p className="text-xl font-semibold">{stats.productCount}</p>
            </div>
          </div>
          <div className="mt-3">
            <NavLink to="/products" className="text-blue-500 hover:text-blue-700 text-sm font-medium">
              Manage Products →
            </NavLink>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-xl font-semibold">{stats.categoryCount}</p>
            </div>
          </div>
          <div className="mt-3">
            <NavLink to="/categories" className="text-green-500 hover:text-green-700 text-sm font-medium">
              Manage Categories →
            </NavLink>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-xl font-semibold">{stats.transactionCount}</p>
            </div>
          </div>
          <div className="mt-3">
            <NavLink to="/transactions" className="text-purple-500 hover:text-purple-700 text-sm font-medium">
              View Transactions →
            </NavLink>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl font-semibold">{formatCurrency(stats.totalSales)}</p>
            </div>
          </div>
          <div className="mt-3">
            <NavLink to="/pos" className="text-yellow-500 hover:text-yellow-700 text-sm font-medium">
              New Sale →
            </NavLink>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NavLink to="/pos" className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 text-center">
            <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>New Sale</span>
          </NavLink>
          <NavLink to="/products" className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-4 text-center">
            <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Add Product</span>
          </NavLink>
          <NavLink to="/categories" className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-4 text-center">
            <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Add Category</span>
          </NavLink>
          <NavLink to="/settings" className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg p-4 text-center">
            <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </NavLink>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Recent Transactions</h2>
        
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No transactions yet.</p>
            <NavLink to="/pos" className="inline-block mt-2 text-blue-500 hover:text-blue-700">
              Create your first sale
            </NavLink>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx._id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.items.length} items</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(tx.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tx.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-4 text-right">
              <NavLink to="/transactions" className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                View All Transactions →
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 