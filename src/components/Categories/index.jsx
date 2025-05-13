import React, { useState, useEffect } from 'react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [notification, setNotification] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const data = await window.api.database.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        showNotification('Failed to load categories', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setCurrentCategory(null);
  };

  const handleAddNew = () => {
    resetForm();
    setFormMode('add');
    setShowForm(true);
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || ''
    });
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }
    
    try {
      await window.api.database.deleteCategory(categoryId);
      setCategories(categories.filter(c => c._id !== categoryId));
      showNotification('Category deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('Failed to delete category', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter categories based on search
  const getFilteredCategories = () => {
    if (!searchTerm.trim()) return categories;
    
    return categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };
  
  // Get paginated categories
  const getPaginatedCategories = () => {
    const filteredCategories = getFilteredCategories();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Update total pages whenever filtered results change
    const newTotalPages = Math.ceil(filteredCategories.length / itemsPerPage);
    if (newTotalPages !== totalPages) {
      setTotalPages(newTotalPages);
      // If current page is greater than new total pages, go to last page
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
        return filteredCategories.slice(
          (newTotalPages - 1) * itemsPerPage,
          newTotalPages * itemsPerPage
        );
      }
    }
    
    return filteredCategories.slice(startIndex, endIndex);
  };
  
  const handlePageChange = (page) => {
    // Ensure page is within bounds
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name) {
      showNotification('Please enter a category name', 'error');
      return;
    }
    
    try {
      if (formMode === 'add') {
        const result = await window.api.database.addCategory(formData);
        setCategories([...categories, result]);
        showNotification('Category added successfully', 'success');
      } else {
        const result = await window.api.database.updateCategory(currentCategory._id, formData);
        setCategories(categories.map(c => 
          c._id === currentCategory._id ? { ...c, ...formData } : c
        ));
        showNotification('Category updated successfully', 'success');
      }
      
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      showNotification('Failed to save category', 'error');
    }
  };

  return (
    <div className="relative">
      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md shadow-md ${
            notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          } text-white z-50`}
        >
          {notification.message}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark-800 dark:text-white">Categories</h1>
        <button
          onClick={handleAddNew}
          className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors duration-150"
        >
          Add New Category
        </button>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search categories by name or description..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full border border-gray-300 dark:border-dark-500 p-2 rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
        />
      </div>
      
      {/* Categories List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-full py-8">
          <div className="animate-pulse-slow text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto">
              <div className="w-10 h-10 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-500 dark:text-dark-300">Loading categories...</p>
          </div>
        </div>
      ) : getFilteredCategories().length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none p-6 transition-colors duration-200">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="mt-2 text-gray-500 dark:text-dark-300">{searchTerm ? 'No categories found matching your search' : 'No categories found'}</p>
          <button
            onClick={handleAddNew}
            className="mt-3 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors duration-150"
          >
            Add your first category
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-700 rounded-lg shadow-soft dark:shadow-none overflow-hidden transition-colors duration-200">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
            <thead className="bg-gray-50 dark:bg-dark-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-700 divide-y divide-gray-200 dark:divide-dark-600">
              {getPaginatedCategories().map(category => (
                <tr key={category._id} className="hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-dark-800 dark:text-white">{category.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 dark:text-dark-300">{category.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 mr-3 transition-colors duration-150"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-150"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-dark-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-dark-500 sm:px-6 mt-4 rounded-lg shadow-soft dark:shadow-none transition-colors duration-200">
          <div className="flex-1 flex justify-between items-center">
            {/* Items per page selector */}
            <div className="flex items-center">
              <span className="text-sm text-gray-700 dark:text-dark-300 mr-2">
                Show
              </span>
              <select 
                value={itemsPerPage} 
                onChange={handleItemsPerPageChange}
                className="border border-gray-300 dark:border-dark-500 rounded-md text-sm px-2 py-1 bg-white dark:bg-dark-600 text-dark-800 dark:text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700 dark:text-dark-300 ml-2">
                per page
              </span>
            </div>
            
            {/* Pagination info */}
            <div className="hidden sm:block">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{getFilteredCategories().length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, getFilteredCategories().length)}
                </span>{' '}
                of <span className="font-medium">{getFilteredCategories().length}</span> categories
              </p>
            </div>
            
            {/* Pagination buttons */}
            <div className="flex items-center space-x-2">
              {/* Previous page button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    // If we have 5 or fewer pages, show all
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    // If we're near the start
                    if (i < 4) {
                      pageNum = i + 1;
                    } else {
                      pageNum = totalPages;
                    }
                  } else if (currentPage >= totalPages - 2) {
                    // If we're near the end
                    if (i === 0) {
                      pageNum = 1;
                    } else {
                      pageNum = totalPages - 4 + i;
                    }
                  } else {
                    // We're in the middle
                    pageNum = currentPage - 2 + i;
                  }
                  
                  // Special case for ellipsis
                  if ((totalPages > 5 && i === 3 && currentPage <= 3) || 
                      (totalPages > 5 && i === 1 && currentPage >= totalPages - 2)) {
                    return (
                      <span key={`ellipsis-${i}`} className="px-3 py-1 text-sm text-gray-700">...</span>
                    );
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              {/* Next page button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{formMode === 'add' ? 'Add New Category' : 'Edit Category'}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  {formMode === 'add' ? 'Add Category' : 'Update Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories; 