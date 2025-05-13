import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Area
} from 'recharts';
import ExportCSVButton from './ExportCSVButton';

const DateRangeReportTab = () => {
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageSalesPerDay: 0,
    averageRevenuePerDay: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // Get default start date (1 month ago)
  function getDefaultStartDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return formatDate(date);
  }

  // Format date to YYYY-MM-DD
  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  // Generate date range for comparison
  function generateComparisonDateRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const comparisonEndDate = new Date(startDate);
    comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
    
    const comparisonStartDate = new Date(comparisonEndDate);
    comparisonStartDate.setDate(comparisonStartDate.getDate() - diffDays);
    
    return {
      start: formatDate(comparisonStartDate),
      end: formatDate(comparisonEndDate)
    };
  }

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Fetch report data based on date range
  useEffect(() => {
    const fetchReportData = async () => {
      if (!startDate || !endDate) return;
      
      setIsLoading(true);
      try {
        // API call to fetch sales data for the date range
        const sales = await window.api.database.getSalesByDateRange(startDate, endDate);
        
        // Process data for charts
        const processedData = processDailyData(sales);
        setReportData(processedData);
        
        // Calculate summary data
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
        
        // Calculate date difference in days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Avoid division by zero
        
        setSummaryData({
          totalSales,
          totalRevenue,
          averageSalesPerDay: totalSales / diffDays,
          averageRevenuePerDay: totalRevenue / diffDays
        });
        
        // Fetch comparison data if needed
        if (showComparison) {
          const comparisonRange = generateComparisonDateRange(startDate, endDate);
          const comparisonSales = await window.api.database.getSalesByDateRange(
            comparisonRange.start, 
            comparisonRange.end
          );
          const comparisonProcessedData = processDailyData(comparisonSales);
          setComparisonData(comparisonProcessedData);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [startDate, endDate, showComparison]);

  // Process data by day
  const processDailyData = (data) => {
    const groupedData = {};
    
    // Initialize dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = formatDate(currentDate);
      groupedData[dateStr] = {
        date: dateStr,
        sales: 0,
        revenue: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill in actual sales data
    data.forEach(sale => {
      const saleDate = formatDate(new Date(sale.date));
      if (groupedData[saleDate]) {
        groupedData[saleDate].sales += 1;
        groupedData[saleDate].revenue += sale.total;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Prepare data for CSV export
  const prepareCSVData = () => {
    const csvData = [
      // Headers
      ['Date', 'Sales Count', 'Revenue'],
      // Data rows
      ...reportData.map(item => [item.date, item.sales, item.revenue])
    ];
    
    return csvData;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-dark-800 dark:text-white">Custom Date Range Report</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Date range selection */}
          <div className="flex items-center space-x-2">
            <div className="flex flex-col">
              <label htmlFor="start-date" className="text-xs text-dark-500 dark:text-dark-300 mb-1">Start Date</label>
              <input
                id="start-date"
                type="date"
                className="border border-gray-300 dark:border-dark-500 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-150"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="end-date" className="text-xs text-dark-500 dark:text-dark-300 mb-1">End Date</label>
              <input
                id="end-date"
                type="date"
                className="border border-gray-300 dark:border-dark-500 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-150"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={formatDate(new Date())}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer mr-2">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-primary-600 dark:text-primary-500 transition duration-150 ease-in-out bg-white dark:bg-dark-600 border-gray-300 dark:border-dark-500 rounded"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
              />
              <span className="ml-2 text-sm text-dark-600 dark:text-dark-300">Compare with previous period</span>
            </label>
            
            <ExportCSVButton 
              data={prepareCSVData()} 
              filename={`sales_report_${startDate}_to_${endDate}.csv`}
            />
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Total Sales</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{summaryData.totalSales}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{formatCurrency(summaryData.totalRevenue)}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Avg. Sales per Day</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{summaryData.averageSalesPerDay.toFixed(1)}</div>
            </div>
            <div className="bg-white dark:bg-dark-700 rounded-lg p-4 shadow-soft dark:shadow-none border border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="text-sm font-medium text-dark-500 dark:text-dark-300 mb-1">Avg. Revenue per Day</div>
              <div className="text-2xl font-bold text-dark-800 dark:text-white">{formatCurrency(summaryData.averageRevenuePerDay)}</div>
            </div>
          </div>
          
          {/* Sales Revenue Chart */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Revenue Trend</h3>
            <div className="h-80 w-full border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-white dark:bg-dark-700 shadow-soft dark:shadow-none transition-colors duration-200">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={reportData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
                  <XAxis dataKey="date" stroke="#6B7280" />
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
                  <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" fill="#82ca9d" stroke="#82ca9d" fillOpacity={0.3} />
                  <Bar yAxisId="left" dataKey="sales" name="Number of Sales" fill="#8884d8" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Comparison Chart (conditional) */}
          {showComparison && reportData.length > 0 && comparisonData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Period Comparison</h3>
              <div className="h-80 w-full border border-gray-200 dark:border-dark-600 rounded-lg p-4 bg-white dark:bg-dark-700 shadow-soft dark:shadow-none transition-colors duration-200">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
                    <XAxis dataKey="index" type="number" domain={[0, Math.max(reportData.length, comparisonData.length)]} stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'var(--color-dark-700, #1f2937)',
                        borderColor: 'var(--color-dark-600, #374151)',
                        color: 'var(--color-white, #ffffff)'
                      }}
                    />
                    <Legend />
                    <Line 
                      data={reportData.map((item, index) => ({ index, revenue: item.revenue }))} 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Current Period" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      data={comparisonData.map((item, index) => ({ index, revenue: item.revenue }))} 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Previous Period" 
                      stroke="#82ca9d" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Data Table */}
          <div>
            <h3 className="text-md font-medium text-dark-700 dark:text-dark-100 mb-4">Daily Breakdown</h3>
            <div className="border border-gray-200 dark:border-dark-600 rounded-lg overflow-hidden shadow-soft dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
                  <thead className="bg-gray-50 dark:bg-dark-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Number of Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
                    {reportData.map((day, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-dark-700' : 'bg-gray-50 dark:bg-dark-600'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-800 dark:text-white">{day.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{day.sales}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">{formatCurrency(day.revenue)}</td>
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

export default DateRangeReportTab; 