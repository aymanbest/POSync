import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import BarcodeScanner from './BarcodeScanner';

const Products = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    categoryId: '',
    stock: '',
    description: '',
    imageData: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [showCategoryPrompt, setShowCategoryPrompt] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Handle URL search query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [location.search]);

  // Fetch products and categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const productsData = await window.api.database.getProducts();
        const categoriesData = await window.api.database.getCategories();
        const settingsData = await window.api.settings.getSettings();
        
        setProducts(productsData);
        setCategories(categoriesData);
        setSettings(settingsData);
        
        // Check if categories are empty and prompt to create one
        if (categoriesData.length === 0) {
          setShowCategoryPrompt(true);
        }
      } catch (error) {
        console.error('Error fetching products and categories:', error);
        showNotification('Failed to load products', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Format currency based on settings
  const formatCurrency = (amount) => {
    return `${settings?.currency || 'DH'} ${amount.toFixed(2)}`;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      price: '',
      categoryId: '',
      stock: '',
      description: '',
      imageData: null
    });
    setSelectedImagePreview(null);
    setCurrentProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddNew = () => {
    // Check if categories exist before allowing product creation
    if (categories.length === 0) {
      setShowCategoryPrompt(true);
      return;
    }
    
    resetForm();
    setFormMode('add');
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name || '',
      barcode: product.barcode || '',
      price: product.price || '',
      categoryId: product.categoryId || '',
      stock: product.stock || '',
      description: product.description || '',
      imageData: null // We'll use the imageUrl for display
    });
    
    // Set image preview from the existing product image
    setSelectedImagePreview(product.imageUrl || null);
    
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      await window.api.database.deleteProduct(productId);
      setProducts(products.filter(p => p._id !== productId));
      showNotification('Product deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification('Failed to delete product', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) || '' : value
    }));
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      showNotification('Please select an image file', 'error');
      return;
    }

    // Create preview and resize if needed
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // If image is large, resize it
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;
        
        // Resize if image is too large
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }
          
          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get resized data URL
          const resizedImage = canvas.toDataURL(file.type || 'image/jpeg', 0.8);
          setSelectedImagePreview(resizedImage);
          setFormData(prev => ({
            ...prev,
            imageData: resizedImage
          }));
        } else {
          // Image is already small enough, use as-is
          setSelectedImagePreview(event.target.result);
          setFormData(prev => ({
            ...prev,
            imageData: event.target.result
          }));
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.barcode || formData.price === '') {
      showNotification('Please fill all required fields', 'error');
      return;
    }

    if (!formData.categoryId) {
      showNotification('Please select a category', 'error');
      return;
    }
    
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : 0
      };
      
      // Handle image data differently for add vs edit
      if (formData.imageData) {
        // Use the new image if one was selected
        productData.imageUrl = formData.imageData;
      } else if (formMode === 'edit' && selectedImagePreview) {
        // If editing and there's a preview but no new image data, keep the existing image
        productData.imageUrl = selectedImagePreview;
      } else {
        // No image
        productData.imageUrl = '';
      }
      
      // Remove imageData field before sending to the database
      delete productData.imageData;
      
      let result;
      
      if (formMode === 'add') {
        result = await window.api.database.addProduct(productData);
        setProducts([...products, result]);
        showNotification('Product added successfully', 'success');
      } else {
        result = await window.api.database.updateProduct(currentProduct._id, productData);
        setProducts(products.map(p => 
          p._id === currentProduct._id ? { ...p, ...productData } : p
        ));
        showNotification('Product updated successfully', 'success');
      }
      
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Failed to save product', 'error');
    }
  };

  const getFilteredProducts = () => {
    if (!searchTerm.trim()) return products;
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  // Get paginated products
  const getPaginatedProducts = () => {
    const filteredProducts = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Update total pages whenever filtered results change
    const newTotalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (newTotalPages !== totalPages) {
      setTotalPages(newTotalPages);
      // If current page is greater than new total pages, go to last page
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
        return filteredProducts.slice(
          (newTotalPages - 1) * itemsPerPage,
          newTotalPages * itemsPerPage
        );
      }
    }
    
    return filteredProducts.slice(startIndex, endIndex);
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

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c._id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  // Handle creating a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showNotification('Please enter a category name', 'error');
      return;
    }

    try {
      const result = await window.api.database.addCategory({ name: newCategoryName.trim() });
      setCategories([...categories, result]);
      setNewCategoryName('');
      setShowCategoryPrompt(false);
      showNotification('Category created successfully', 'success');
      
      // If we were showing the form already, update the categoryId
      if (showForm) {
        setFormData(prev => ({
          ...prev,
          categoryId: result._id
        }));
      } else {
        // If not showing form yet, show it now
        setFormMode('add');
        resetForm();
        setFormData(prev => ({
          ...prev,
          categoryId: result._id
        }));
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('Failed to create category', 'error');
    }
  };

  const handleManageStock = (product) => {
    navigate('/stock-management', { state: { productToAdd: product } });
  };

  // Check if product has low stock
  const isLowStock = (product) => {
    const lowStockThreshold = settings?.lowStockThreshold || 5;
    return product.stock !== undefined && product.stock <= lowStockThreshold && product.stock > 0;
  };

  // Handle barcode detection
  const handleBarcodeDetected = (barcode) => {
    if (!barcode || barcode.trim() === '') {
      showNotification('Invalid barcode detected', 'error');
      return;
    }
    
    // Check if barcode already exists
    const existingProduct = products.find(p => p.barcode === barcode);
    if (existingProduct && formMode === 'add') {
      showNotification(`Barcode ${barcode} already exists for product "${existingProduct.name}"`, 'error');
      // Optional: Fill the form with the existing product data
      setFormData({
        ...formData,
        barcode: barcode
      });
    } else {
      // Set the barcode in the form
      setFormData({
        ...formData,
        barcode: barcode
      });
      showNotification(`Barcode detected: ${barcode}`, 'success');
    }
    
    // Close the scanner
    setShowScanner(false);
  };

  // Make sure to close the scanner when the form is closed
  const handleCloseForm = () => {
    setShowForm(false);
    setShowScanner(false);
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
      
      {/* Category Prompt Modal */}
      {showCategoryPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create Category First</h2>
            <p className="text-gray-600 mb-4">
              You need to create at least one category before adding products.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category name"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setShowCategoryPrompt(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Create Category
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>
                You can also manage categories from the{' '}
                <NavLink to="/categories" className="text-blue-500 hover:underline">
                  Categories
                </NavLink>{' '}
                section.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Add New Product
        </button>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products by name, barcode or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Product Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{formMode === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name*
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
                    Barcode*
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="border border-l-0 border-gray-300 bg-gray-100 p-2 rounded-r-md hover:bg-gray-200"
                      title="Scan Barcode"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price* ({settings?.currency || 'DH'})
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                  </label>
                  <div className="flex space-x-2">
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryPrompt(true)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-md flex-shrink-0"
                    >
                      + New
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Image2
                  </label>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 h-20 w-20 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                      {selectedImagePreview ? (
                        <img 
                          src={selectedImagePreview} 
                          alt="Product preview" 
                          className="h-10 w-10" 
                        />
                      ) : (
                        <span className="text-gray-400">Image</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Recommended: Square images under 1MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
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
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  {formMode === 'add' ? 'Add Product' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Product List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading products...</p>
        </div>
      ) : getPaginatedProducts().length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow p-6">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-2 text-gray-500">
            {searchTerm ? 'No products found matching your search' : 'No products found'}
          </p>
          <button
            onClick={handleAddNew}
            className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getPaginatedProducts().map(product => (
                <tr key={product._id} className={`hover:bg-gray-50 ${isLowStock(product) ? 'bg-yellow-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img className="max-h-12 max-w-12 object-contain" src={product.imageUrl} alt={product.name} />
                        ) : (
                          <span className="text-sm font-medium text-gray-500">
                            {product.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.barcode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryName(product.categoryId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.stock <= 0 ? 'bg-red-600 text-white' : 
                      isLowStock(product) ? 'bg-amber-500 text-white' : 
                      'bg-green-600 text-white'
                    }`}>
                      {product.stock !== undefined ? product.stock : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleManageStock(product)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Stock
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
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
          <div className="flex-1 flex justify-between items-center">
            {/* Items per page selector */}
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">
                Show
              </span>
              <select 
                value={itemsPerPage} 
                onChange={handleItemsPerPageChange}
                className="border border-gray-300 rounded-md text-sm px-2 py-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-700 ml-2">
                per page
              </span>
            </div>
            
            {/* Pagination info */}
            <div className="hidden sm:block">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{getFilteredProducts().length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, getFilteredProducts().length)}
                </span>{' '}
                of <span className="font-medium">{getFilteredProducts().length}</span> products
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
      
      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner 
          onDetected={handleBarcodeDetected} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
};

export default Products; 