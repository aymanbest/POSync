import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import ExportCSVButton from './ExportCSVButton';

const SalesReportTab = () => {
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [timeFrame, setTimeFrame] = useState('week');
  const [isLoading, setIsLoading] = useState(true);

  // COLORS for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  // Fetch sales data based on time frame
  useEffect(() => {
    const fetchSalesData = async () => {
      setIsLoading(true);
      try {
        // API call to fetch sales data
        const sales = await window.api.database.getSalesByTimeFrame(timeFrame);
        const products = await window.api.database.getTopSellingProducts(timeFrame);
        
        // Process sales data for charts
        const processedSalesData = processSalesData(sales, timeFrame);
        
        // Calculate totals
        const revenue = sales.reduce((acc, sale) => acc + sale.total, 0);
        
        setSalesData(processedSalesData);
        setTopProducts(products.slice(0, 7)); // Top 7 products
        setTotalRevenue(revenue);
        setTotalSales(sales.length);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [timeFrame]);

  // Process sales data for different time frames
  const processSalesData = (data, timeFrame) => {
    // Group sales by day/week/month based on timeFrame
    const groupedData = {};
    
    data.forEach(sale => {
      let key;
      const date = new Date(sale.date);
      
      if (timeFrame === 'day') {
        // Group by hour
        key = date.getHours().toString().padStart(2, '0') + ':00';
      } else if (timeFrame === 'week') {
        // Group by day of week
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        key = days[date.getDay()];
      } else if (timeFrame === 'month') {
        // Group by day of month
        key = date.getDate().toString();
      } else if (timeFrame === 'year') {
        // Group by month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        key = months[date.getMonth()];
      }
      
      if (!groupedData[key]) {
        groupedData[key] = {
          name: key,
          sales: 0,
          revenue: 0
        };
      }
      
      groupedData[key].sales += 1;
      groupedData[key].revenue += sale.total;
    });
    
    // Convert to array and sort
    let result = Object.values(groupedData);
    
    // Sort data based on time frame
    if (timeFrame === 'day') {
      // Sort by hour
      result.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    } else if (timeFrame === 'week') {
      // Sort by day of week (Sunday first)
      const dayOrder = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      result.sort((a, b) => dayOrder[a.name] - dayOrder[b.name]);
    } else if (timeFrame === 'month') {
      // Sort by day of month
      result.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    } else if (timeFrame === 'year') {
      // Sort by month
      const monthOrder = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
      result.sort((a, b) => monthOrder[a.name] - monthOrder[b.name]);
    }
    
    return result;
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
      ['Time Period', 'Sales Count', 'Revenue'],
      // Data rows
      ...salesData.map(item => [item.name, item.sales, item.revenue])
    ];
    
    return csvData;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-dark-800 dark:text-white">Sales Report</h2>
        
        {/* Time frame selection */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-dark-500 dark:text-dark-300">Time Frame:</span>
          <select 
            className="border border-gray-300 dark:border-dark-500 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-150"
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <ExportCSVButton 
            data={prepareCSVData()} 
            filename={`sales_report_${timeFrame}_${new Date().toISOString().split('T')[0]}.csv`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Total Sales</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{totalSales}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{formatCurrency(totalRevenue)}</div>
            </div>
          </div>
          
          {/* Sales Bar Chart */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Sales Over Time</h3>
            <div className="h-80 w-full border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-white dark:bg-dark-700 shadow-soft dark:shadow-none transition-colors duration-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'revenue') return formatCurrency(value);
                      return value;
                    }}
                    contentStyle={{
                      backgroundColor: 'var(--color-dark-700, #1f2937)',
                      borderColor: 'var(--color-dark-600, #374151)',
                      color: 'var(--color-white, #ffffff)'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="sales" name="Number of Sales" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Top Products */}
          <div>
            <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Top Selling Products</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-80 border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-white dark:bg-dark-700 shadow-soft dark:shadow-none transition-colors duration-200">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="salesCount"
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value, props.payload.name]} 
                      contentStyle={{
                        backgroundColor: 'var(--color-dark-700, #1f2937)',
                        borderColor: 'var(--color-dark-600, #374151)',
                        color: 'var(--color-white, #ffffff)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Products List */}
              <div className="border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden shadow-soft dark:shadow-none">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
                  <thead className="bg-gray-50 dark:bg-dark-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Units Sold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
                    {topProducts.map((product, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-dark-700' : 'bg-gray-50 dark:bg-dark-600'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-800 dark:text-white">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{product.salesCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{formatCurrency(product.revenue)}</td>
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

export default SalesReportTab; 