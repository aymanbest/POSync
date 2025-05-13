import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import LowStockNotification from './LowStockNotification';
import { 
  IconHome, 
  IconShoppingCart, 
  IconBox, 
  IconCategory, 
  IconReceipt, 
  IconChartBar, 
  IconPackages, 
  IconSettings,
  IconMenu2,
  IconSun,
  IconMoon,
  IconUser,
  IconLogout
} from '@tabler/icons-react';

const Navbar = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsData = await window.api.settings.getSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <IconHome size={20} /> },
    { path: '/pos', label: 'POS', icon: <IconShoppingCart size={20} /> },
    { path: '/products', label: 'Products', icon: <IconBox size={20} /> },
    { path: '/categories', label: 'Categories', icon: <IconCategory size={20} /> },
    { path: '/transactions', label: 'Transactions', icon: <IconReceipt size={20} /> },
    { path: '/reports', label: 'Reports', icon: <IconChartBar size={20} /> },
    { path: '/stock-management', label: 'Stock', icon: <IconPackages size={20} /> },
    { path: '/settings', label: 'Settings', icon: <IconSettings size={20} /> }
  ];

  return (
    <nav className="bg-white dark:bg-dark-700 shadow-sm dark:shadow-none border-b border-gray-200 dark:border-dark-600 transition-colors duration-200">
      <div className="mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and company name */}
          <div className="flex items-center">
            <NavLink to="/" className="flex-shrink-0 flex items-center app-no-drag">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-soft">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="ml-2 text-xl font-display font-semibold text-dark-800 dark:text-white">
                Pro<span className="text-primary-600 dark:text-primary-400">POS</span>
              </span>
            </NavLink>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-50 dark:bg-dark-600 text-primary-700 dark:text-primary-400'
                      : 'text-dark-600 dark:text-dark-100 hover:bg-gray-50 dark:hover:bg-dark-600 hover:text-primary-600 dark:hover:text-primary-400'
                  }`
                }
              >
                <span className={location.pathname === item.path ? 'text-primary-600 dark:text-primary-400' : 'text-dark-400 dark:text-dark-200'}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Right side menu (dark mode toggle, notifications, profile) */}
          <div className="flex items-center space-x-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-dark-500 dark:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none transition-colors duration-200"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
            </button>
            
            {/* Notifications */}
            {settings && <LowStockNotification settings={settings} />}
            
            {/* User profile dropdown */}
            <div className="relative">
              <div className="flex items-center">
                <div className="hidden sm:flex sm:flex-col sm:items-end mr-2">
                  <span className="text-sm font-medium text-dark-800 dark:text-white">{user.username}</span>
                  <span className="text-xs text-dark-500 dark:text-dark-300">{user.role}</span>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-dark-600 flex items-center justify-center text-primary-700 dark:text-primary-400">
                  <IconUser size={20} />
                </div>
                <button
                  onClick={onLogout}
                  className="ml-2 p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none transition-colors duration-200"
                  aria-label="Logout"
                >
                  <IconLogout size={20} />
                </button>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md text-dark-500 dark:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none transition-colors duration-200"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle menu"
              >
                <IconMenu2 size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-dark-600 text-primary-700 dark:text-primary-400'
                    : 'text-dark-600 dark:text-dark-100 hover:bg-gray-50 dark:hover:bg-dark-600'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 