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

    // Create realistic categories with products
    console.log(`Creating categories and products...`);
    
    // Define realistic categories with their associated colors
    const categoryDefinitions = [
      {
        name: 'Electronics',
        color: '#2196F3',
        products: [
          { name: 'Smartphone Charger', price: 15.99, barcode: '7891234567890' },
          { name: 'Wireless Earbuds', price: 89.99, barcode: '7891234567891' },
          { name: 'USB Flash Drive 32GB', price: 19.99, barcode: '7891234567892' },
          { name: 'Bluetooth Speaker', price: 49.99, barcode: '7891234567893' },
          { name: 'HDMI Cable 6ft', price: 12.99, barcode: '7891234567894' },
          { name: 'Wireless Mouse', price: 24.99, barcode: '7891234567895' }
        ]
      },
      {
        name: 'Food & Beverages',
        color: '#4CAF50',
        products: [
          { name: 'Organic Coffee Beans', price: 12.99, barcode: '6891234567890' },
          { name: 'Chocolate Bar', price: 3.99, barcode: '6891234567891' },
          { name: 'Sparkling Water', price: 1.99, barcode: '6891234567892' },
          { name: 'Protein Bar', price: 2.49, barcode: '6891234567893' },
          { name: 'Mixed Nuts 250g', price: 7.99, barcode: '6891234567894' },
          { name: 'Organic Green Tea', price: 5.99, barcode: '6891234567895' }
        ]
      },
      {
        name: 'Clothing',
        color: '#9C27B0',
        products: [
          { name: 'Cotton T-Shirt', price: 19.99, barcode: '5891234567890' },
          { name: 'Denim Jeans', price: 49.99, barcode: '5891234567891' },
          { name: 'Wool Socks', price: 9.99, barcode: '5891234567892' },
          { name: 'Baseball Cap', price: 14.99, barcode: '5891234567893' },
          { name: 'Leather Belt', price: 29.99, barcode: '5891234567894' }
        ]
      },
      {
        name: 'Home & Kitchen',
        color: '#FF9800',
        products: [
          { name: 'Stainless Steel Pot', price: 34.99, barcode: '4891234567890' },
          { name: 'Ceramic Mug Set', price: 24.99, barcode: '4891234567891' },
          { name: 'Cutting Board', price: 19.99, barcode: '4891234567892' },
          { name: 'Kitchen Towels', price: 12.99, barcode: '4891234567893' },
          { name: 'Silicone Spatula', price: 8.99, barcode: '4891234567894' }
        ]
      },
      {
        name: 'Beauty & Personal Care',
        color: '#E91E63',
        products: [
          { name: 'Shampoo 500ml', price: 8.99, barcode: '3891234567890' },
          { name: 'Facial Moisturizer', price: 14.99, barcode: '3891234567891' },
          { name: 'Toothpaste', price: 3.99, barcode: '3891234567892' },
          { name: 'Hand Soap', price: 4.99, barcode: '3891234567893' },
          { name: 'Deodorant', price: 5.99, barcode: '3891234567894' }
        ]
      },
      {
        name: 'Office Supplies',
        color: '#607D8B',
        products: [
          { name: 'Notebook', price: 4.99, barcode: '2891234567890' },
          { name: 'Ballpoint Pens (10pk)', price: 7.99, barcode: '2891234567891' },
          { name: 'Desk Organizer', price: 19.99, barcode: '2891234567892' },
          { name: 'Stapler', price: 8.99, barcode: '2891234567893' },
          { name: 'Sticky Notes', price: 3.99, barcode: '2891234567894' }
        ]
      },
      {
        name: 'Sports & Outdoors',
        color: '#00BCD4',
        products: [
          { name: 'Yoga Mat', price: 29.99, barcode: '1891234567890' },
          { name: 'Water Bottle 750ml', price: 14.99, barcode: '1891234567891' },
          { name: 'Tennis Balls (3pk)', price: 9.99, barcode: '1891234567892' },
          { name: 'Resistance Bands', price: 19.99, barcode: '1891234567893' },
          { name: 'Fitness Tracker', price: 89.99, barcode: '1891234567894' }
        ]
      },
      {
        name: 'Toys & Games',
        color: '#FFEB3B',
        products: [
          { name: 'Board Game', price: 24.99, barcode: '9891234567890' },
          { name: 'Puzzle 1000pc', price: 19.99, barcode: '9891234567891' },
          { name: 'Action Figure', price: 14.99, barcode: '9891234567892' },
          { name: 'Playing Cards', price: 5.99, barcode: '9891234567893' },
          { name: 'Remote Control Car', price: 39.99, barcode: '9891234567894' }
        ]
      },
      {
        name: 'Books & Media',
        color: '#795548',
        products: [
          { name: 'Bestseller Novel', price: 16.99, barcode: '8891234567890' },
          { name: 'Cookbook', price: 24.99, barcode: '8891234567891' },
          { name: 'Magazine', price: 6.99, barcode: '8891234567892' },
          { name: 'Children\'s Book', price: 12.99, barcode: '8891234567893' },
          { name: 'Calendar', price: 14.99, barcode: '8891234567894' }
        ]
      },
      {
        name: 'Health & Wellness',
        color: '#8BC34A',
        products: [
          { name: 'Multivitamin (60ct)', price: 19.99, barcode: '7791234567890' },
          { name: 'Digital Thermometer', price: 12.99, barcode: '7791234567891' },
          { name: 'First Aid Kit', price: 24.99, barcode: '7791234567892' },
          { name: 'Hand Sanitizer', price: 3.99, barcode: '7791234567893' },
          { name: 'Face Masks (10pk)', price: 9.99, barcode: '7791234567894' }
        ]
      }
    ];

    // Limit to the requested number of categories
    const categoriesToCreate = categoryDefinitions.slice(0, numCategories);
    
    // Create categories and their products
    const categories = [];
    for (const categoryDef of categoriesToCreate) {
      const category = {
        name: categoryDef.name,
        description: faker.lorem.sentence(),
        color: categoryDef.color,
        createdAt: new Date()
      };
      
      const savedCategory = await promisify(db.categories.insert.bind(db.categories), category);
      categories.push(savedCategory);
      
      // Create products for this category
      const productsToCreate = categoryDef.products;
      for (const productDef of productsToCreate) {
        const stock = faker.number.int({ min: seedStockMin, max: seedStockMax });
        
        const product = {
          name: productDef.name,
          description: faker.commerce.productDescription(),
          price: productDef.price,
          cost: productDef.price * 0.6, // Cost is 60% of the selling price
          categoryId: savedCategory._id,
          barcode: productDef.barcode,
          stock: stock,
          stockAlert: Math.floor(stock * 0.2), // Alert at 20% of stock
          image: null, // No image by default
          isActive: true,
          createdAt: new Date()
        };
        
        await promisify(db.products.insert.bind(db.products), product);
      }
    }
    
    // If we need more products to reach the requested number, add generic ones
    const totalDefinedProducts = categoriesToCreate.reduce((sum, cat) => sum + cat.products.length, 0);
    if (totalDefinedProducts < numProducts) {
      const additionalProducts = numProducts - totalDefinedProducts;
      console.log(`Creating ${additionalProducts} additional generic products...`);
      
      for (let i = 0; i < additionalProducts; i++) {
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
          stock: stock,
          stockAlert: Math.floor(stock * 0.2), // Alert at 20% of stock
          image: null, // No image by default
          isActive: true,
          createdAt: new Date()
        };
        
        await promisify(db.products.insert.bind(db.products), product);
      }
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