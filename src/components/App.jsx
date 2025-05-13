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
import Reports from '../pages/Reports';

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }

    // Check for dark mode preference
    const darkModePref = localStorage.getItem('darkMode') === 'true';
    setDarkMode(darkModePref);
    if (darkModePref) {
      document.documentElement.classList.add('dark');
    }

    setIsLoading(false);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
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
                  <Route path="/pos" element={<POS user={user} />} />
                  <Route path="/products" element={<Products user={user} />} />
                  <Route path="/categories" element={<Categories user={user} />} />
                  <Route path="/transactions" element={<Transactions user={user} />} />
                  <Route path="/settings" element={<Settings user={user} />} />
                  <Route path="/stock-management" element={<StockManagement user={user} />} />
                  <Route path="/reports" element={<Reports user={user} />} />
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