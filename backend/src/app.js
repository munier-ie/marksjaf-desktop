const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const bookingsRoutes = require('./routes/bookings');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import the new user management routes
const userManagementRoutes = require('./routes/userManagement');
// Add transactions routes import
const transactionsRoutes = require('./routes/transactions');
// Add inventory routes import
const inventoryRoutes = require('./routes/inventory');
// Add reports routes import
const reportsRoutes = require('./routes/reports');
// Add printer routes import
const printerRoutes = require('./routes/printer');

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:3001',
    /^file:\/\//,
    /https:\/\/.*\.ngrok-free\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// The specific CORS headers for /uploads are no longer needed and can be removed.

// Static files for uploads
const { uploadDir } = require('./config/localStorage');
app.use('/uploads', express.static(uploadDir));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
// if (process.env.NODE_ENV !== 'test') {
//   app.use(morgan('combined'));
// }

// Health check endpoint
// Add this import at the top
const { prisma } = require('./config/prisma');

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingsRoutes);
// Add user management routes
app.use('/api/admin/users', userManagementRoutes);
// Add transactions routes
app.use('/api/admin/transactions', transactionsRoutes);
// Add inventory routes
app.use('/api/inventory', inventoryRoutes);
// Add reports routes
app.use('/api/reports', reportsRoutes);
// Add printer routes
app.use('/api', printerRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;