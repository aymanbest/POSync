import React, { useState } from 'react';

const SetupWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    currency: 'USD',
    taxRate: 0,
    taxName: 'Tax',
    taxType: 'added',
    adminUsername: '',
    adminPassword: '',
    adminConfirmPassword: '',
    defaultEmployee: 'Cashier',
    lowStockThreshold: 5,
    useNumPad: true,
    paymentMethods: {
      cash: true,
      card: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for the field being changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : parseFloat(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    console.log("Validating step:", currentStep);
    
    // Always pass validation for the welcome screen
    if (currentStep === 0) {
      console.log("Welcome screen, skipping validation");
      return true;
    } 
    else if (currentStep === 1) {
      console.log("Validating business information");
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    } 
    else if (currentStep === 2) {
      console.log("Validating financial settings");
      if (formData.taxRate < 0) newErrors.taxRate = 'Tax rate cannot be negative';
      if (!formData.taxName.trim()) newErrors.taxName = 'Tax name is required';
      if (!formData.currency.trim()) newErrors.currency = 'Currency is required';
    }
    else if (currentStep === 3) {
      console.log("Validating admin account");
      if (!formData.adminUsername.trim()) newErrors.adminUsername = 'Username is required';
      if (!formData.adminPassword.trim()) newErrors.adminPassword = 'Password is required';
      else if (formData.adminPassword.length < 6) newErrors.adminPassword = 'Password must be at least 6 characters';
      if (formData.adminPassword !== formData.adminConfirmPassword) newErrors.adminConfirmPassword = 'Passwords do not match';
    }
    
    console.log("Validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    console.log("Next button clicked, current step:", currentStep);
    if (validateStep()) {
      console.log("Validation passed, moving to next step");
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        console.log("New current step:", currentStep + 1);
      }
    } else {
      console.log("Validation failed, staying on current step");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (validateStep()) {
      setLoading(true);
      try {
        // Save business settings
        await window.api.settings.updateSettings({
          businessName: formData.businessName,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          currency: formData.currency,
          taxRate: formData.taxRate,
          taxName: formData.taxName,
          taxType: formData.taxType,
          defaultEmployee: formData.defaultEmployee,
          lowStockThreshold: formData.lowStockThreshold,
          useNumPad: formData.useNumPad,
          paymentMethods: formData.paymentMethods,
          isSetupComplete: true
        });
        
        // Create admin user
        await window.api.auth.createAdmin({
          username: formData.adminUsername,
          password: formData.adminPassword
        });
        
        // Complete setup
        onComplete();
      } catch (error) {
        console.error('Setup failed:', error);
        setErrors({ submit: 'Setup failed. Please try again.' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Define the steps and their content
  const steps = [
    // Step 0: Welcome
    {
      title: 'Welcome to Electron POS',
      description: 'Let\'s set up your Point of Sale system',
      content: (
        <div className="text-center py-8">
          <div className="w-32 h-32 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mx-auto flex items-center justify-center mb-6">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome to Electron POS</h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This wizard will guide you through setting up your POS system.<br />
            We'll help you configure your business information, financial settings, and create an admin account.
          </p>
          
          <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-left">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Business Information</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">Set up your business details and contact information</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-left">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Financial Settings</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">Configure currency and tax settings</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-left">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Admin Account</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">Create your administrator login credentials</p>
            </div>
          </div>
          
          <p className="text-gray-500 dark:text-gray-400 italic">
            Click 'Next' to begin the setup process.
          </p>
        </div>
      )
    },
    
    // Step 1: Business Information
    {
      title: 'Business Information',
      description: 'Tell us about your business',
      content: (
        <div className="space-y-4">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${errors.businessName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              placeholder="Your Business Name"
            />
            {errors.businessName && <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>}
          </div>
          
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address *
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              placeholder="123 Main St, City, Country"
              rows="2"
            />
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
                placeholder="+1 234 567 8900"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
                placeholder="your@email.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>
        </div>
      )
    },
    
    // Step 2: Financial Settings
    {
      title: 'Financial Settings',
      description: 'Set up your currency and tax information',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency *
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.currency ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="CAD">CAD - Canadian Dollar (C$)</option>
                <option value="AUD">AUD - Australian Dollar (A$)</option>
                <option value="CNY">CNY - Chinese Yuan (¥)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="MAD">MAD - Moroccan Dirham (DH)</option>
              </select>
              {errors.currency && <p className="mt-1 text-sm text-red-500">{errors.currency}</p>}
            </div>
            
            <div>
              <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                id="lowStockThreshold"
                name="lowStockThreshold"
                value={formData.lowStockThreshold}
                onChange={handleNumberChange}
                min="0"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Items with stock below this number will be highlighted
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                id="taxRate"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleNumberChange}
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 rounded-lg border ${errors.taxRate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              />
              {errors.taxRate && <p className="mt-1 text-sm text-red-500">{errors.taxRate}</p>}
            </div>
            
            <div>
              <label htmlFor="taxName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Name
              </label>
              <input
                type="text"
                id="taxName"
                name="taxName"
                value={formData.taxName}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.taxName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
                placeholder="VAT, GST, Sales Tax, etc."
              />
              {errors.taxName && <p className="mt-1 text-sm text-red-500">{errors.taxName}</p>}
            </div>
            
            <div>
              <label htmlFor="taxType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Type
              </label>
              <select
                id="taxType"
                name="taxType"
                value={formData.taxType}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
              >
                <option value="added">Added to price</option>
                <option value="included">Included in price</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useNumPad"
                name="useNumPad"
                checked={formData.useNumPad}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="useNumPad" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Use Number Pad for Cash Payments
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-6">
              Enables a calculator-style number pad for entering cash payment amounts
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Methods
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Select which payment methods to enable in the POS
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="paymentMethodCash"
                  name="paymentMethodCash"
                  checked={formData.paymentMethods.cash}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      paymentMethods: {
                        ...prev.paymentMethods,
                        cash: e.target.checked
                      }
                    }));
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="paymentMethodCash" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cash
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="paymentMethodCard"
                  name="paymentMethodCard"
                  checked={formData.paymentMethods.card}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      paymentMethods: {
                        ...prev.paymentMethods,
                        card: e.target.checked
                      }
                    }));
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="paymentMethodCard" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Card/Credit Card
                </label>
              </div>
            </div>
          </div>
        </div>
      )
    },
    
    // Step 3: Admin Account
    {
      title: 'Admin Account',
      description: 'Create your administrator account',
      content: (
        <div className="space-y-4">
          <div>
            <label htmlFor="adminUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Username *
            </label>
            <input
              type="text"
              id="adminUsername"
              name="adminUsername"
              value={formData.adminUsername}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${errors.adminUsername ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              placeholder="admin"
            />
            {errors.adminUsername && <p className="mt-1 text-sm text-red-500">{errors.adminUsername}</p>}
          </div>
          
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="adminPassword"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${errors.adminPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              placeholder="••••••••"
            />
            {errors.adminPassword && <p className="mt-1 text-sm text-red-500">{errors.adminPassword}</p>}
          </div>
          
          <div>
            <label htmlFor="adminConfirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              id="adminConfirmPassword"
              name="adminConfirmPassword"
              value={formData.adminConfirmPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${errors.adminConfirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500`}
              placeholder="••••••••"
            />
            {errors.adminConfirmPassword && <p className="mt-1 text-sm text-red-500">{errors.adminConfirmPassword}</p>}
          </div>
          
          <div>
            <label htmlFor="defaultEmployee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Employee Name
            </label>
            <input
              type="text"
              id="defaultEmployee"
              name="defaultEmployee"
              value={formData.defaultEmployee}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
              placeholder="Cashier"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Name that will appear on receipts
            </p>
          </div>
        </div>
      )
    },
    
    // Step 4: Completion
    {
      title: 'Ready to Go!',
      description: 'Your POS system is almost ready',
      content: (
        <div className="text-center py-8">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Setup Complete!
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            You've successfully configured your POS system.<br />
            Click 'Finish' to start using your new application.
          </p>
          
          {errors.submit && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {errors.submit}
            </div>
          )}
        </div>
      )
    }
  ];

  // Calculate progress percentage
  const progress = currentStep === 0 ? 0 : 20 + ((currentStep - 1) / (steps.length - 2)) * 80;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden w-full max-w-4xl">
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
          <div 
            className="h-full bg-primary-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="p-6 sm:p-10">
          <div className="p-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {steps[currentStep].title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {steps[currentStep].description}
              </p>
            </div>

            {steps[currentStep].content}
          </div>
          
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`px-6 py-2.5 rounded-lg font-medium ${
                currentStep === 0 
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Back
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  console.log("Direct next button clicked, current step:", currentStep);
                  if (currentStep === 0) {
                    console.log("Force advancing to step 1");
                    setCurrentStep(1);
                  } else {
                    nextStep();
                  }
                }}
                className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:bg-primary-400"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting Up...
                  </span>
                ) : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard; 