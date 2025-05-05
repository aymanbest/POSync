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
import StockManagement from './StockManagement';
import Reports from '../pages/Reports';

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(false);
  }, []);

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
    return <div>Loading...</div>;
  }

  return (
    <Router>
      {user ? (
        <>
          <Navbar user={user} onLogout={handleLogout} />
          <div className="container mx-auto px-4 py-4">
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
        </>
      ) : (
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      )}
    </Router>
  );
};

export default App; 