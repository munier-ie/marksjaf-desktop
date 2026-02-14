require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/prisma');

const PORT = process.env.PORT || 5000;

// Initialize database connection (non-blocking)
connectDB().catch(error => {
  console.error('Database initialization failed:', error.message);
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
});

// WebSocket server removed

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});