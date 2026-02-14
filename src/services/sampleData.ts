// Sample data for offline mode
export const sampleCategories = [
  {
    id: '1',
    name: 'Traditional Nigerian Meals',
    description: 'Authentic Nigerian dishes',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Rice Dishes',
    description: 'Various rice preparations',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Soups & Stews',
    description: 'Nigerian soups and stews',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Beverages',
    description: 'Drinks and beverages',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Snacks',
    description: 'Light snacks and appetizers',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const sampleItems = [
  {
    id: '1',
    name: 'Jollof Rice',
    description: 'Spicy Nigerian rice dish',
    price: 1500,
    stock_quantity: 50,
    low_stock_threshold: 10,
    status: 'active',
    type: 'food',
    category_id: '2',
    categories: { name: 'Rice Dishes' },
    image_url: '/images/jollof-rice.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Fried Rice',
    description: 'Nigerian style fried rice',
    price: 1800,
    stock_quantity: 30,
    low_stock_threshold: 8,
    status: 'active',
    type: 'food',
    category_id: '2',
    categories: { name: 'Rice Dishes' },
    image_url: '/images/fried-rice.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Egusi Soup',
    description: 'Traditional melon seed soup',
    price: 2000,
    stock_quantity: 25,
    low_stock_threshold: 5,
    status: 'active',
    type: 'food',
    category_id: '3',
    categories: { name: 'Soups & Stews' },
    image_url: '/images/egusi-soup.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Pepper Soup',
    description: 'Spicy Nigerian pepper soup',
    price: 1200,
    stock_quantity: 40,
    low_stock_threshold: 10,
    status: 'active',
    type: 'food',
    category_id: '3',
    categories: { name: 'Soups & Stews' },
    image_url: '/images/pepper-soup.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Pounded Yam',
    description: 'Traditional pounded yam',
    price: 800,
    stock_quantity: 35,
    low_stock_threshold: 8,
    status: 'active',
    type: 'food',
    category_id: '1',
    categories: { name: 'Traditional Nigerian Meals' },
    image_url: '/images/pounded-yam.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Suya',
    description: 'Grilled spiced meat',
    price: 1000,
    stock_quantity: 20,
    low_stock_threshold: 5,
    status: 'active',
    type: 'food',
    category_id: '5',
    categories: { name: 'Snacks' },
    image_url: '/images/suya.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Zobo Drink',
    description: 'Nigerian hibiscus drink',
    price: 500,
    stock_quantity: 60,
    low_stock_threshold: 15,
    status: 'active',
    type: 'beverage',
    category_id: '4',
    categories: { name: 'Beverages' },
    image_url: '/images/zobo.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Chin Chin',
    description: 'Crunchy fried pastry',
    price: 300,
    stock_quantity: 80,
    low_stock_threshold: 20,
    status: 'active',
    type: 'snack',
    category_id: '5',
    categories: { name: 'Snacks' },
    image_url: '/images/chin-chin.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '9',
    name: 'Amala',
    description: 'Yam flour swallow',
    price: 600,
    stock_quantity: 45,
    low_stock_threshold: 10,
    status: 'active',
    type: 'food',
    category_id: '1',
    categories: { name: 'Traditional Nigerian Meals' },
    image_url: '/images/amala.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '10',
    name: 'Palm Wine',
    description: 'Traditional palm wine',
    price: 800,
    stock_quantity: 15,
    low_stock_threshold: 3,
    status: 'active',
    type: 'beverage',
    category_id: '4',
    categories: { name: 'Beverages' },
    image_url: '/images/palm-wine.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const sampleUsers = [
  {
    id: '1',
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@marksjaf.com',
    phone_number: '+234-800-000-0001',
    role: 'admin',
    is_active: true,
    is_email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+234-800-000-0002',
    role: 'staff',
    is_active: true,
    is_email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone_number: '+234-800-000-0003',
    role: 'customer',
    is_active: true,
    is_email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const sampleOrders = [
  {
    id: '1',
    customer_name: 'Walk-in Customer',
    customer_phone: '+234-800-000-0004',
    items: [
      {
        id: '1',
        name: 'Jollof Rice',
        price: 1500,
        quantity: 2,
        total: 3000
      },
      {
        id: '7',
        name: 'Zobo Drink',
        price: 500,
        quantity: 1,
        total: 500
      }
    ],
    total_amount: 3500,
    status: 'completed',
    payment_method: 'cash',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '2',
    customer_name: 'Mary Johnson',
    customer_phone: '+234-800-000-0005',
    items: [
      {
        id: '3',
        name: 'Egusi Soup',
        price: 2000,
        quantity: 1,
        total: 2000
      },
      {
        id: '5',
        name: 'Pounded Yam',
        price: 800,
        quantity: 1,
        total: 800
      }
    ],
    total_amount: 2800,
    status: 'completed',
    payment_method: 'card',
    created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    updated_at: new Date(Date.now() - 43200000).toISOString()
  }
];

// Function to initialize sample data in IndexedDB
export const initializeSampleData = async () => {
  try {
    const offlineService = await import('./offlineService').then(module => module.default);
    
    // Check if data already exists
    const existingItems = await offlineService.getData('items');
    if (existingItems && existingItems.length > 0) {
      console.log('Sample data already exists, skipping initialization');
      return;
    }
    
    console.log('Initializing sample data for offline mode...');
    
    // Store sample data
    await offlineService.storeMultipleData('categories', sampleCategories);
    await offlineService.storeMultipleData('items', sampleItems);
    await offlineService.storeMultipleData('users', sampleUsers);
    await offlineService.storeMultipleData('orders', sampleOrders);
    
    // Update metadata
    await offlineService.storeData('metadata', {
      key: 'lastSync',
      value: new Date().toISOString()
    });
    
    console.log('Sample data initialized successfully');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};