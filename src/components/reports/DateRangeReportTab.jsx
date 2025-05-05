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
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Custom Date Range Report</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Date range selection */}
          <div className="flex items-center space-x-2">
            <div className="flex flex-col">
              <label htmlFor="start-date" className="text-xs text-gray-500 mb-1">Start Date</label>
              <input
                id="start-date"
                type="date"
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="end-date" className="text-xs text-gray-500 mb-1">End Date</label>
              <input
                id="end-date"
                type="date"
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-600">Compare with previous period</span>
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
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-500">Loading data...</span>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Sales</div>
              <div className="text-2xl font-bold text-gray-800">{summaryData.totalSales}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-800">{formatCurrency(summaryData.totalRevenue)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Avg. Sales per Day</div>
              <div className="text-2xl font-bold text-gray-800">{summaryData.averageSalesPerDay.toFixed(1)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500 mb-1">Avg. Revenue per Day</div>
              <div className="text-2xl font-bold text-gray-800">{formatCurrency(summaryData.averageRevenuePerDay)}</div>
            </div>
          </div>
          
          {/* Sales Revenue Chart */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-4">Revenue Trend</h3>
            <div className="h-80 w-full border border-gray-200 rounded-lg p-4 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={reportData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'revenue') return formatCurrency(value);
                    return value;
                  }} />
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
              <h3 className="text-md font-medium text-gray-700 mb-4">Period Comparison</h3>
              <div className="h-80 w-full border border-gray-200 rounded-lg p-4 bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" type="number" domain={[0, Math.max(reportData.length, comparisonData.length)]} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
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
            <h3 className="text-md font-medium text-gray-700 mb-4">Daily Breakdown</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((day, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.sales}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(day.revenue)}</td>
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