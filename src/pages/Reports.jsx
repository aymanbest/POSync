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
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h1>
      
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 ease-in-out ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`fas fa-${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Reports; 