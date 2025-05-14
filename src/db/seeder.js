const db = require('./index');
const { faker } = require('@faker-js/faker');

// Seed categories and products for development
async function seedDatabase(options = {}) {
  const {
    enabled = false,            // Disable by default
    numCategories = 10,         // Number of categories to create
    numProducts = 30,           // Number of products to create
    clearExisting = false,      // Whether to clear existing data
    seedPriceMin = 5,           // Minimum product price
    seedPriceMax = 500,         // Maximum product price
    seedStockMin = 1,           // Minimum stock level
    seedStockMax = 100,         // Maximum stock level
  } = options;

  // If seeding is disabled, return early
  if (!enabled) {
    console.log('Database seeding is disabled.');
    return { success: false, message: 'Seeding is disabled' };
  }

  console.log('Starting database seeding...');

  // Helper to promisify NeDB operations
  const promisify = (dbMethod, ...args) => {
    return new Promise((resolve, reject) => {
      dbMethod(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

  try {
    // Clear existing data if requested
    if (clearExisting) {
      console.log('Clearing existing data...');
      await promisify(db.categories.remove.bind(db.categories), {}, { multi: true });
      await promisify(db.products.remove.bind(db.products), {}, { multi: true });
    }

    // Create sample categories
    console.log(`Creating ${numCategories} categories...`);
    const categoryTypes = [
      'Electronics', 'Clothing', 'Food', 'Beverages', 'Household', 
      'Beauty', 'Health', 'Toys', 'Books', 'Sports', 'Office', 
      'Furniture', 'Automotive', 'Pet Supplies', 'Garden', 'Tools'
    ];

    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'gray', 'yellow', 'pink', 'brown', 'teal'];
    
    const categories = [];
    for (let i = 0; i < numCategories; i++) {
      const categoryType = categoryTypes[i % categoryTypes.length];
      const color = colors[i % colors.length];
      
      const category = {
        name: `${categoryType} ${i + 1}`,
        description: faker.lorem.sentence(),
        color: color,
        createdAt: new Date()
      };
      
      const savedCategory = await promisify(db.categories.insert.bind(db.categories), category);
      categories.push(savedCategory);
    }

    // Create sample products
    console.log(`Creating ${numProducts} products...`);
    for (let i = 0; i < numProducts; i++) {
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const price = faker.number.float({ min: seedPriceMin, max: seedPriceMax, precision: 2 });
      const stock = faker.number.int({ min: seedStockMin, max: seedStockMax });
      
      const product = {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: price,
        cost: price * 0.6, // Cost is 60% of the selling price
        categoryId: randomCategory._id,
        barcode: faker.string.numeric(13),
        stockQuantity: stock,
        stockAlert: Math.floor(stock * 0.2), // Alert at 20% of stock
        image: null, // No image by default
        isActive: true,
        createdAt: new Date()
      };
      
      await promisify(db.products.insert.bind(db.products), product);
    }

    console.log('Database seeding completed successfully!');
    return { success: true, message: 'Seeding completed successfully' };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, message: error.message };
  }
}

// Export the seeder function
module.exports = { seedDatabase }; 