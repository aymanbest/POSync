import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap
} from 'recharts';
import ExportCSVButton from './ExportCSVButton';

const StockReportTab = () => {
  const [productData, setProductData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    estimatedValue: 0
  });
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  // COLORS for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STOCK_STATUS_COLORS = {
    outOfStock: '#EF4444', // Red
    lowStock: '#F59E0B',   // Amber
    inStock: '#10B981'     // Green
  };

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      try {
        // Get low stock threshold from settings if available
        const settings = await window.api.database.getSettings();
        if (settings?.lowStockThreshold) {
          setLowStockThreshold(settings.lowStockThreshold);
        }
        
        // API call to fetch products
        const products = await window.api.database.getProducts();
        
        // Process data
        const processed = processProductData(products);
        setProductData(processed.products);
        setCategoryData(processed.categories);
        setSummaryData(processed.summary);
      } catch (error) {
        console.error('Error fetching product data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, []);

  // Fetch product data on filter change
  useEffect(() => {
    const fetchProductData = async () => {
      setIsLoading(true);
      try {
        // Get low stock threshold from settings if available
        const settings = await window.api.settings.getSettings();
        if (settings?.lowStockThreshold) {
          setLowStockThreshold(settings.lowStockThreshold);
        }
        
        // API call to fetch stock report with filtered products
        const products = await window.api.database.getProductsStockReport(stockFilter);
        
        // Process data
        const processed = processProductData(products);
        setProductData(processed.products);
        setCategoryData(processed.categories);
        setSummaryData(processed.summary);
      } catch (error) {
        console.error('Error fetching product data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [stockFilter, lowStockThreshold, sortBy, processProductData]);

  // Reapply sorting when sortBy changes
  useEffect(() => {
    if (productData.length > 0) {
      // Just re-sort existing data without fetching again
      const processed = processProductData(productData);
      setProductData(processed.products);
    }
  }, [sortBy, processProductData, productData]);

  // Process product data for display using useCallback
  const processProductData = useCallback((products) => {
    // Products are already filtered by the API, just need to sort them
    let processedProducts = [...products];
    
    // Apply sorting
    if (sortBy === 'name') {
      processedProducts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stock-asc') {
      processedProducts.sort((a, b) => a.stock - b.stock);
    } else if (sortBy === 'stock-desc') {
      processedProducts.sort((a, b) => b.stock - a.stock);
    } else if (sortBy === 'value-desc') {
      processedProducts.sort((a, b) => b.stockValue - a.stockValue);
    }
    
    // Process category data
    const categoriesMap = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categoriesMap[category]) {
        categoriesMap[category] = {
          name: category,
          stockCount: 0,
          productCount: 0,
          value: 0
        };
      }
      
      categoriesMap[category].stockCount += product.stock || 0;
      categoriesMap[category].productCount += 1;
      categoriesMap[category].value += (product.stock || 0) * (product.price || 0);
    });
    
    // Calculate summary data
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= lowStockThreshold).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const estimatedValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    
    // Enhance product data with additional info
    const enhancedProducts = processedProducts.map(product => ({
      ...product,
      stockStatus: product.stock === 0 ? 'outOfStock' : 
                   product.stock <= lowStockThreshold ? 'lowStock' : 'inStock',
      stockValue: (product.stock || 0) * (product.price || 0)
    }));
    
    return {
      products: enhancedProducts,
      categories: Object.values(categoriesMap),
      summary: {
        totalProducts,
        totalStock,
        lowStockCount,
        outOfStockCount,
        estimatedValue
      }
    };
  }, [lowStockThreshold, sortBy]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Prepare data for CSV export
  const prepareCSVData = () => {
    const csvData = [
      // Headers
      ['Product Name', 'Category', 'Stock Quantity', 'Price', 'Stock Value', 'Status'],
      // Data rows
      ...productData.map(product => [
        product.name,
        product.category || 'Uncategorized',
        product.stock || 0,
        product.price || 0,
        (product.stock || 0) * (product.price || 0),
        product.stockStatus === 'outOfStock' ? 'Out of Stock' : 
          product.stockStatus === 'lowStock' ? 'Low Stock' : 'In Stock'
      ])
    ];
    
    return csvData;
  };

  // Get readable stock status
  const getStockStatusText = (status) => {
    switch (status) {
      case 'outOfStock': return 'Out of Stock';
      case 'lowStock': return 'Low Stock';
      case 'inStock': return 'In Stock';
      default: return 'Unknown';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-dark-800 dark:text-white">Stock Products Report</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex items-center">
            <label className="text-sm text-dark-500 dark:text-dark-300 mr-2">Status:</label>
            <select 
              className="border border-gray-300 dark:border-dark-500 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-150"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All Products</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="healthy">Healthy Stock</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label className="text-sm text-dark-500 dark:text-dark-300 mr-2">Sort By:</label>
            <select 
              className="border border-gray-300 dark:border-dark-500 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-150"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="stock-asc">Stock (Low to High)</option>
              <option value="stock-desc">Stock (High to Low)</option>
              <option value="value-desc">Value (High to Low)</option>
            </select>
          </div>
          
          <ExportCSVButton 
            data={prepareCSVData()} 
            filename={`stock_report_${new Date().toISOString().split('T')[0]}.csv`}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
            <div className="w-10 h-10 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="ml-4 text-dark-500 dark:text-dark-300">Loading data...</span>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Total Products</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{summaryData.totalProducts}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Total Stock Quantity</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{summaryData.totalStock}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Low Stock Items</div>
              <div className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{summaryData.lowStockCount}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Out of Stock</div>
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">{summaryData.outOfStockCount}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Inventory Value</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summaryData.estimatedValue)}</div>
            </div>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Stock Status Distribution */}
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Stock Status Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Out of Stock', value: summaryData.outOfStockCount, color: STOCK_STATUS_COLORS.outOfStock },
                        { name: 'Low Stock', value: summaryData.lowStockCount, color: STOCK_STATUS_COLORS.lowStock },
                        { name: 'Healthy Stock', value: summaryData.totalProducts - summaryData.lowStockCount - summaryData.outOfStockCount, color: STOCK_STATUS_COLORS.inStock }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          index === 0 ? STOCK_STATUS_COLORS.outOfStock :
                          index === 1 ? STOCK_STATUS_COLORS.lowStock :
                          STOCK_STATUS_COLORS.inStock
                        } />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Products']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Category Distribution */}
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Category Stock Value</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={categoryData}
                    dataKey="value"
                    ratio={4/3}
                    stroke="#fff"
                    fill="#8884d8"
                  >
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-dark-700 p-2 border border-gray-200 dark:border-dark-600 shadow-md rounded text-dark-800 dark:text-white">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">Products: {data.productCount}</p>
                              <p className="text-sm">Stock: {data.stockCount} units</p>
                              <p className="text-sm">Value: {formatCurrency(data.value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Stock Level Chart */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Top 15 Products by Inventory Value</h3>
            <div className="h-80 w-full border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-white dark:bg-dark-700 shadow-soft dark:shadow-none transition-colors duration-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productData.slice(0, 15).sort((a, b) => b.stockValue - a.stockValue)}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                    stroke="#6B7280"
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (name === 'stockValue') return formatCurrency(value);
                      return value;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgb(var(--color-dark-700))',
                      borderColor: 'rgb(var(--color-dark-600))',
                      color: 'rgb(var(--color-white))'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="stockValue" 
                    name="Inventory Value" 
                    fill="#8884d8"
                    radius={[0, 4, 4, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Product Table */}
          <div>
            <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Product Inventory List</h3>
            <div className="border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden shadow-soft dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
                  <thead className="bg-gray-50 dark:bg-dark-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
                    {productData.map((product, index) => (
                      <tr key={product._id || index} className={index % 2 === 0 ? 'bg-white dark:bg-dark-700' : 'bg-gray-50 dark:bg-dark-600'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-800 dark:text-white">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{product.category || 'Uncategorized'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{product.stock || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{formatCurrency(product.stockValue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${product.stockStatus === 'outOfStock' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 
                              product.stockStatus === 'lowStock' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 
                              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'} transition-colors duration-150`}>
                            {getStockStatusText(product.stockStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StockReportTab; 