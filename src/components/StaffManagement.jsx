import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  TRANSACTIONS: 'transactions',
  REPORTS: 'reports',
  STOCK: 'stock',
  SETTINGS: 'settings',
  STAFF: 'staff',
  INVENTORY_ALERTS: 'inventory_alerts',
};

// Define roles with preset permissions
const ROLE_PRESETS = {
  admin: {
    label: 'Administrator',
    description: 'Full access to all system features',
    permissions: Object.values(PERMISSIONS),
  },
  manager: {
    label: 'Manager',
    description: 'Can manage all operations but not system settings or staff',
    permissions: [
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.POS,
      PERMISSIONS.PRODUCTS,
      PERMISSIONS.CATEGORIES,
      PERMISSIONS.TRANSACTIONS,
      PERMISSIONS.REPORTS,
      PERMISSIONS.STOCK,
      PERMISSIONS.INVENTORY_ALERTS,
    ],
  },
  cashier: {
    label: 'Cashier',
    description: 'Can only use POS and view products',
    permissions: [
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.POS,
      PERMISSIONS.TRANSACTIONS,
    ],
  },
  stockManager: {
    label: 'Stock Manager',
    description: 'Can manage products and stock',
    permissions: [
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.PRODUCTS,
      PERMISSIONS.CATEGORIES,
      PERMISSIONS.STOCK,
      PERMISSIONS.INVENTORY_ALERTS,
    ],
  },
};

const StaffManagement = ({ user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'cashier',
    customPermissions: [],
    active: true,
    email: '',
    phone: '',
  });

  // Check if current user has staff management permission
  useEffect(() => {
    if (user && (!user.permissions || !user.permissions.includes(PERMISSIONS.STAFF))) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const usersData = await window.api.staff.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        showNotification('Failed to load users', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'cashier',
      customPermissions: [],
      active: true,
      email: '',
      phone: '',
    });
    setCurrentUser(null);
    setError(null);
  };

  const handleAddNew = () => {
    resetForm();
    setFormMode('add');
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setCurrentUser(user);
    setFormData({
      username: user.username || '',
      password: '', // Don't populate password field for security
      confirmPassword: '',
      fullName: user.fullName || '',
      role: user.role || 'cashier',
      customPermissions: user.permissions || [],
      active: user.active !== false, // Default to true if not set
      email: user.email || '',
      phone: user.phone || '',
    });
    setFormMode('edit');
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData((prev) => ({
      ...prev,
      role,
      customPermissions: ROLE_PRESETS[role]?.permissions || [],
    }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData((prev) => {
      const permissions = [...prev.customPermissions];
      if (permissions.includes(permission)) {
        return {
          ...prev,
          customPermissions: permissions.filter((p) => p !== permission),
        };
      } else {
        return {
          ...prev,
          customPermissions: [...permissions, permission],
        };
      }
    });
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }

    if (formMode === 'add' && !formData.password) {
      setError('Password is required');
      return false;
    }

    if (formMode === 'add' && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.customPermissions.length === 0) {
      setError('At least one permission must be selected');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        ...formData,
        // Don't send confirmPassword to the server
        confirmPassword: undefined,
        // Only send password if it's provided (for edits)
        password: formData.password || undefined,
        permissions: formData.customPermissions,
      };

      let result;
      if (formMode === 'add') {
        result = await window.api.staff.addUser(userData);
        setUsers([...users, result]);
        showNotification('User added successfully', 'success');
      } else {
        result = await window.api.staff.updateUser(currentUser._id, userData);
        setUsers(users.map(u => u._id === currentUser._id ? { ...u, ...userData } : u));
        showNotification('User updated successfully', 'success');
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      setError(error.message || 'Failed to save user');
    }
  };

  const handleDeleteConfirm = (userId) => {
    setConfirmDelete(userId);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    
    try {
      await window.api.staff.deleteUser(confirmDelete);
      setUsers(users.filter(u => u._id !== confirmDelete));
      showNotification('User deleted successfully', 'success');
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Failed to delete user', 'error');
    }
  };

  const getFilteredUsers = () => {
    if (!searchTerm.trim()) return users;
    
    return users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="animate-pulse-slow text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
            <div className="w-10 h-10 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-500 dark:text-dark-300">Loading staff accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
            notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          } text-white`}
        >
          {notification.message}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-dark-700 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Confirm Delete</h2>
            <p className="text-gray-600 dark:text-dark-300 mb-4">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="bg-gray-300 hover:bg-gray-400 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-800 dark:text-dark-100 px-4 py-2 rounded-md transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 rounded-md transition-colors duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
        <button
          onClick={handleAddNew}
          className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white px-4 py-2 rounded-md transition-colors duration-150"
        >
          Add New Staff
        </button>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by username, name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-400 transition-colors duration-150"
        />
      </div>
      
      {/* User Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-dark-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-colors duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {formMode === 'add' ? 'Add New Staff' : 'Edit Staff'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 dark:text-dark-300 hover:text-gray-700 dark:hover:text-dark-100 transition-colors duration-150"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4" role="alert">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Username*
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                    disabled={formMode === 'edit'} // Username can't be changed once created
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Password {formMode === 'edit' ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                    required={formMode === 'add'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Confirm Password {formMode === 'edit' ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                    required={formMode === 'add'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleRoleChange}
                    className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-dark-600 text-gray-900 dark:text-white transition-colors duration-150"
                  >
                    {Object.entries(ROLE_PRESETS).map(([role, { label }]) => (
                      <option key={role} value={role}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                    {ROLE_PRESETS[formData.role]?.description || ''}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1">
                    Status
                  </label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-dark-500 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-dark-200">Active Account</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(PERMISSIONS).map(([key, permission]) => (
                    <div key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`perm-${permission}`}
                        checked={formData.customPermissions.includes(permission)}
                        onChange={() => handlePermissionToggle(permission)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-dark-500 rounded"
                      />
                      <label htmlFor={`perm-${permission}`} className="ml-2 text-sm text-gray-700 dark:text-dark-200 capitalize">
                        {permission}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-800 dark:text-dark-100 px-4 py-2 rounded-md transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white px-4 py-2 rounded-md transition-colors duration-150"
                >
                  {formMode === 'add' ? 'Add Staff' : 'Update Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Users List */}
      <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none overflow-hidden transition-colors duration-200">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
          <thead className="bg-gray-50 dark:bg-dark-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
            {getFilteredUsers().map(user => (
              <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-dark-500 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-dark-300">
                        {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
                          user.username.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                      <div className="text-sm text-gray-500 dark:text-dark-300">{user.fullName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
                    {ROLE_PRESETS[user.role]?.label || user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.active !== false ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {user.active !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-300">
                  {user.email && (
                    <div>{user.email}</div>
                  )}
                  {user.phone && (
                    <div>{user.phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 mr-4 transition-colors duration-150"
                  >
                    Edit
                  </button>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleDeleteConfirm(user._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-150"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffManagement; 