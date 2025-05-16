import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  IconMenu2, 
  IconX, 
  IconMoon, 
  IconSun, 
  IconBox, 
  IconSettings, 
  IconBell, 
  IconLogout, 
  IconUser,
  IconDashboard,
  IconCash,
  IconTag,
  IconHistory,
  IconReportAnalytics,
  IconPackage,
  IconUsers,
  IconChevronDown,
  IconApps
} from '@tabler/icons-react';
import LowStockNotification from './LowStockNotification';

// Check if user has permission to access a specific route
const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.includes(permission) || false;
};

const Navbar = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const inventoryDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);

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
    setInventoryDropdownOpen(false);
    setAdminDropdownOpen(false);
  }, [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(event.target)) {
        setInventoryDropdownOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Group menu items by category
  const inventoryItems = [
    { path: '/products', label: 'Products', icon: <IconBox size={20} />, permission: 'products' },
    { path: '/categories', label: 'Categories', icon: <IconTag size={20} />, permission: 'categories' },
    { path: '/stock-management', label: 'Stock', icon: <IconPackage size={20} />, permission: 'stock' },
  ];

  const adminItems = [
    { path: '/settings', label: 'Settings', icon: <IconSettings size={20} />, permission: 'settings' },
    { path: '/staff', label: 'Staff', icon: <IconUsers size={20} />, permission: 'staff' },
    { path: '/reports', label: 'Reports', icon: <IconReportAnalytics size={20} />, permission: 'reports' },
  ];

  const mainItems = [
    { path: '/', label: 'Dashboard', icon: <IconDashboard size={20} />, permission: 'dashboard' },
    { path: '/pos', label: 'POS', icon: <IconCash size={20} />, permission: 'pos' },
    { path: '/transactions', label: 'Transactions', icon: <IconHistory size={20} />, permission: 'transactions' },
  ];

  // Check if user has access to any items in a group
  const hasInventoryAccess = inventoryItems.some(item => hasPermission(user, item.permission));
  const hasAdminAccess = adminItems.some(item => hasPermission(user, item.permission));

  // Handle dark mode toggle with debug
  const handleDarkModeToggle = () => {
    console.log('Toggling dark mode from:', darkMode, 'to:', !darkMode);
    toggleDarkMode();
    // Verify the result after a short delay
    setTimeout(() => {
      console.log('Dark mode is now:', !darkMode);
      console.log('Dark class on HTML:', document.documentElement.classList.contains('dark'));
    }, 100);
  };

  return (
    <nav className="bg-white dark:bg-dark-700 shadow-sm dark:shadow-none border-b border-gray-200 dark:border-dark-600 transition-colors duration-200">
      <div className="mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and company name */}
          <div className="flex items-center">
            <NavLink to="/" className="flex-shrink-0 flex items-center app-no-drag">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-soft overflow-hidden">
                <img src="./assets/images/logo.png" alt="ProPOS Logo" className="h-full w-full object-cover" />
              </div>
              <span className="ml-2 text-xl font-display font-semibold text-dark-800 dark:text-white">
                Pro<span className="text-primary-600 dark:text-primary-400">POS</span>
              </span>
            </NavLink>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {/* Main items */}
            {mainItems
              .filter(item => hasPermission(user, item.permission))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `${isActive ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400' : 'border-transparent text-dark-500 dark:text-dark-300 hover:text-dark-700 dark:hover:text-dark-100 hover:border-gray-300 dark:hover:border-dark-500'} px-3 py-2 text-sm font-medium border-b-2 flex items-center transition-colors duration-150`
                  }
                >
                  <span className="mr-1">{item.icon}</span> {item.label}
                </NavLink>
              ))
            }

            {/* Inventory dropdown */}
            {hasInventoryAccess && (
              <div className="relative" ref={inventoryDropdownRef}>
                <button
                  onClick={() => setInventoryDropdownOpen(!inventoryDropdownOpen)}
                  className={`${location.pathname.includes('/products') || location.pathname.includes('/categories') || location.pathname.includes('/stock') ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400' : 'border-transparent text-dark-500 dark:text-dark-300 hover:text-dark-700 dark:hover:text-dark-100 hover:border-gray-300 dark:hover:border-dark-500'} px-3 py-2 text-sm font-medium border-b-2 flex items-center transition-colors duration-150`}
                >
                  <IconBox size={18} className="mr-1" /> Inventory <IconChevronDown size={16} className={`ml-1 transition-transform ${inventoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {inventoryDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-dark-700 rounded-md shadow-lg py-1 z-20 border border-gray-100 dark:border-dark-600">
                    {inventoryItems
                      .filter(item => hasPermission(user, item.permission))
                      .map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) => 
                            `block px-4 py-2 text-sm ${
                              isActive
                                ? 'bg-primary-50 dark:bg-dark-600 text-primary-700 dark:text-primary-400'
                                : 'text-dark-600 dark:text-dark-100 hover:bg-gray-50 dark:hover:bg-dark-600'
                            } flex items-center`
                          }
                        >
                          <span className="mr-2">{item.icon}</span> {item.label}
                        </NavLink>
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            {/* Admin dropdown */}
            {hasAdminAccess && (
              <div className="relative" ref={adminDropdownRef}>
                <button
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                  className={`${location.pathname.includes('/settings') || location.pathname.includes('/staff') || location.pathname.includes('/reports') ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400' : 'border-transparent text-dark-500 dark:text-dark-300 hover:text-dark-700 dark:hover:text-dark-100 hover:border-gray-300 dark:hover:border-dark-500'} px-3 py-2 text-sm font-medium border-b-2 flex items-center transition-colors duration-150`}
                >
                  <IconApps size={18} className="mr-1" /> Admin <IconChevronDown size={16} className={`ml-1 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {adminDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-dark-700 rounded-md shadow-lg py-1 z-20 border border-gray-100 dark:border-dark-600">
                    {adminItems
                      .filter(item => hasPermission(user, item.permission))
                      .map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) => 
                            `block px-4 py-2 text-sm ${
                              isActive
                                ? 'bg-primary-50 dark:bg-dark-600 text-primary-700 dark:text-primary-400'
                                : 'text-dark-600 dark:text-dark-100 hover:bg-gray-50 dark:hover:bg-dark-600'
                            } flex items-center`
                          }
                        >
                          <span className="mr-2">{item.icon}</span> {item.label}
                        </NavLink>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side menu (dark mode toggle, notifications, profile) */}
          <div className="flex items-center space-x-3">
            {/* Dark mode toggle */}
            <button
              onClick={handleDarkModeToggle}
              className="p-2 rounded-full text-dark-500 dark:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none transition-colors duration-200"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
            </button>
            
            {/* Notifications */}
            {settings && <LowStockNotification settings={settings} user={user} />}
            
            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-dark-500"></div>
            
            {/* User profile section */}
            <div className="relative flex items-center">
              <div className="hidden sm:flex sm:flex-col sm:items-end mr-3">
                <span className="text-sm font-medium text-dark-800 dark:text-white">{user.username}</span>
                <span className="text-xs text-dark-500 dark:text-dark-300">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-dark-600 flex items-center justify-center text-primary-700 dark:text-primary-400 border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800 transition-colors duration-200">
                <IconUser size={20} />
              </div>
            </div>
            
            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none transition-colors duration-200"
              aria-label="Logout"
              title="Logout"
            >
              <IconLogout size={20} />
            </button>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center ml-1">
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md text-dark-500 dark:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none transition-colors duration-200"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600">
          {/* Main items */}
          {mainItems
            .filter(item => hasPermission(user, item.permission))
            .map((item) => (
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
            ))
          }

          {/* Inventory section */}
          {hasInventoryAccess && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                Inventory
              </div>
              {inventoryItems
                .filter(item => hasPermission(user, item.permission))
                .map((item) => (
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
                ))
              }
            </>
          )}

          {/* Admin section */}
          {hasAdminAccess && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                Admin
              </div>
              {adminItems
                .filter(item => hasPermission(user, item.permission))
                .map((item) => (
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
                ))
              }
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 