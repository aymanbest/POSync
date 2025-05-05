import React, { useState, useEffect } from 'react';
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

  // Process product data for display
  const processProductData = (products) => {
    // Filter and sort products based on current filters
    let filteredProducts = [...products];
    
    // Apply stock filter
    if (stockFilter === 'low') {
      filteredProducts = filteredProducts.filter(p => p.stock > 0 && p.stock <= lowStockThreshold);
    } else if (stockFilter === 'out') {
      filteredProducts = filteredProducts.filter(p => p.stock === 0);
    } else if (stockFilter === 'healthy') {
      filteredProducts = filteredProducts.filter(p => p.stock > lowStockThreshold);
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stock-asc') {
      filteredProducts.sort((a, b) => a.stock - b.stock);
    } else if (sortBy === 'stock-desc') {
      filteredProducts.sort((a, b) => b.stock - a.stock);
    } else if (sortBy === 'value-desc') {
      filteredProducts.sort((a, b) => (b.stock * b.price) - (a.stock * a.price));
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
    const enhancedProducts = filteredProducts.map(product => ({
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
  };

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
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Stock Products Report</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex items-center">
            <label className="text-sm text-gray-500 mr-2">Status:</label>
            <select 
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="text-sm text-gray-500 mr-2">Sort By:</label>
            <select 
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-500">Loading data...</span>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Products</div>
              <div className="text-2xl font-bold text-gray-800">{summaryData.totalProducts}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Stock Quantity</div>
              <div className="text-2xl font-bold text-gray-800">{summaryData.totalStock}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Low Stock Items</div>
              <div className="text-2xl font-bold text-yellow-500">{summaryData.lowStockCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Out of Stock</div>
              <div className="text-2xl font-bold text-red-500">{summaryData.outOfStockCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Inventory Value</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.estimatedValue)}</div>
            </div>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Stock Status Distribution */}
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <h3 className="text-md font-medium text-gray-700 mb-4">Stock Status Distribution</h3>
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
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <h3 className="text-md font-medium text-gray-700 mb-4">Category Stock Value</h3>
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
                            <div className="bg-white p-2 border border-gray-200 shadow-md rounded">
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
            <h3 className="text-md font-medium text-gray-700 mb-4">Top 15 Products by Inventory Value</h3>
            <div className="h-80 w-full border border-gray-200 rounded-lg p-4 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productData.slice(0, 15).sort((a, b) => b.stockValue - a.stockValue)}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip formatter={(value, name, props) => {
                    if (name === 'stockValue') return formatCurrency(value);
                    return value;
                  }} />
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
            <h3 className="text-md font-medium text-gray-700 mb-4">Product Inventory List</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productData.map((product, index) => (
                      <tr key={product._id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category || 'Uncategorized'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(product.stockValue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${product.stockStatus === 'outOfStock' ? 'bg-red-100 text-red-800' : 
                              product.stockStatus === 'lowStock' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}`}>
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