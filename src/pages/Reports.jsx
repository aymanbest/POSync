import React, { useState } from 'react';
import SalesReportTab from '../components/reports/SalesReportTab';
import DateRangeReportTab from '../components/reports/DateRangeReportTab';
import StockReportTab from '../components/reports/StockReportTab';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales');

  // Tabs configuration
  const tabs = [
    { id: 'sales', label: 'Sales Report', icon: 'cash-register' },
    { id: 'dates', label: 'Report by Dates', icon: 'calendar' },
    { id: 'stock', label: 'Stock Products Report', icon: 'box' }
  ];

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales':
        return <SalesReportTab />;
      case 'dates':
        return <DateRangeReportTab />;
      case 'stock':
        return <StockReportTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-dark-800 p-6 transition-colors duration-200">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-800 dark:text-white">Reports</h1>
        <p className="text-gray-500 dark:text-dark-300">View and analyze your business performance</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none overflow-hidden transition-colors duration-200">
        <div className="flex border-b border-gray-200 dark:border-dark-600">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center px-6 py-3 text-sm font-medium focus:outline-none transition-colors duration-150 whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-dark-300 hover:text-dark-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-dark-600'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas fa-${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 overflow-auto transition-colors duration-200">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Reports; 