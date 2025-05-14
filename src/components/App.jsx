import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Products from './Products';
import Categories from './Categories';
import Transactions from './Transactions';
import Settings from './Settings';
import POS from './POS';
import Navbar from './Navbar';
import TitleBar from './TitleBar';
import StockManagement from './StockManagement';
import StaffManagement from './StaffManagement';
import Reports from '../pages/Reports';
import SetupWizard from './SetupWizard';

// Define permissions for each route
const ROUTE_PERMISSIONS = {
  '/': 'dashboard',
  '/pos': 'pos',
  '/products': 'products',
  '/categories': 'categories',
  '/transactions': 'transactions',
  '/settings': 'settings',
  '/stock-management': 'stock',
  '/reports': 'reports',
  '/staff': 'staff'
};

// Protected route component
const ProtectedRoute = ({ user, permission, element }) => {
  // Admin can access everything
  if (user?.role === 'admin') {
    return element;
  }
  
  // Check if user has required permission
  if (user?.permissions?.includes(permission)) {
    return element;
  }
  
  // Redirect to dashboard if user doesn't have permission
  return <Navigate to="/" replace />;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    // Check if setup is complete
    const checkSetup = async () => {
      try {
        // First check if the isSetupComplete flag is set in settings
        const settings = await window.api.settings.getSettings();
        
        if (settings && settings.isSetupComplete === true) {
          console.log('Setup complete: Found isSetupComplete flag');
          setSetupComplete(true);
          return;
        }
        
        // If no explicit setup flag, check if there are any users in the DB
        // If there are users, especially admin users, we can assume setup was done
        try {
          const users = await window.api.auth.getUsers();
          if (users && users.length > 0 && users.some(user => user.role === 'admin')) {
            // Found admin users, so DB is populated - mark setup as complete
            console.log('Setup complete: Found admin users');
            setSetupComplete(true);
            
            // Also save the settings to set the flag for future app launches
            if (settings) {
              await window.api.settings.updateSettings({
                ...settings,
                isSetupComplete: true
              });
            } else {
              // If somehow settings don't exist but users do, create default settings
              await window.api.settings.updateSettings({
                businessName: 'POS System',
                isSetupComplete: true
              });
            }
            return;
          }
          
          // No admin users found - setup is not complete
          console.log('Setup not complete: No admin users found');
          setSetupComplete(false);
        } catch (userError) {
          console.error('Error checking users:', userError);
          setSetupComplete(false);
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
        
        // If there was an error getting settings, check if users exist directly
        try {
          const users = await window.api.auth.getUsers();
          if (users && users.length > 0 && users.some(user => user.role === 'admin')) {
            // Admin users exist, so database is populated - consider setup complete
            console.log('Setup complete (fallback): Found admin users');
            setSetupComplete(true);
            return;
          }
          
          // No admin users found in fallback check
          console.log('Setup not complete (fallback): No admin users found');
          setSetupComplete(false);
        } catch (fallbackError) {
          console.error('Fallback user check failed:', fallbackError);
          setSetupComplete(false);
        }
      }
    };
    
    // Check if user is already logged in (from localStorage)
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
    };

    // Check for dark mode preference
    const checkTheme = () => {
      const darkModePref = localStorage.getItem('darkMode') === 'true';
      setDarkMode(darkModePref);
      if (darkModePref) {
        document.documentElement.classList.add('dark');
      }
    };

    const initializeApp = async () => {
      await checkSetup();
      checkAuth();
      checkTheme();
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  const handleSetupComplete = () => {
    setSetupComplete(true);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    // Apply the dark mode change to the document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const result = await window.api.auth.login(credentials);
      if (result.success) {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-dark-800">
        <div className="animate-pulse-slow">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Show setup wizard if setup is not complete
  if (!setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <Router>
      <div className="flex flex-col h-screen">
        <TitleBar />
        
        {user ? (
          <>
            <Navbar user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            <main className="flex-1 overflow-auto bg-gray-50 dark:bg-dark-800 transition-colors duration-200">
              <div className="container mx-auto px-4 py-4 animate-fade-in">
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route 
                    path="/pos" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/pos']} 
                        element={<POS user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/products" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/products']} 
                        element={<Products user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/categories" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/categories']} 
                        element={<Categories user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/transactions" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/transactions']} 
                        element={<Transactions user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/settings']} 
                        element={<Settings user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/stock-management" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/stock-management']} 
                        element={<StockManagement user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/reports" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/reports']} 
                        element={<Reports user={user} />}
                      />
                    } 
                  />
                  <Route 
                    path="/staff" 
                    element={
                      <ProtectedRoute 
                        user={user} 
                        permission={ROUTE_PERMISSIONS['/staff']} 
                        element={<StaffManagement user={user} />}
                      />
                    } 
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
            <footer className="py-2 px-4 bg-white dark:bg-dark-700 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-dark-600 transition-colors duration-200">
              <div className="container mx-auto flex justify-between items-center">
                <div>© {new Date().getFullYear()} Electron POS</div>
                <div>Version 1.0.0</div>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex bg-gray-50 dark:bg-dark-800 transition-colors duration-200">
            <Routes>
              <Route path="*" element={<Login onLogin={handleLogin} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
            </Routes>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App; 