const { PrismaClient } = require('@prisma/client');

// Debug logging for database connection
console.log('🔧 Prisma Configuration:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
console.log('   IS_PACKAGED:', process.env.IS_PACKAGED || 'false');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');

// Initialize Prisma Client with dynamic database URL
// The DATABASE_URL is set by the Electron main process before spawning the backend
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Enhanced connection function with retry logic
async function connectDB() {
  const maxRetries = 5;
  const retryDelay = 3000; // 3 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting database connection (${attempt}/${maxRetries})...`);
      console.log(`📁 Database URL: ${process.env.DATABASE_URL || 'NOT SET'}`);
      await prisma.$connect();

      // Test the connection with a simple query
      await prisma.$queryRaw`SELECT 1`;

      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        console.error('❌ All database connection attempts failed. Please check:');
        console.error('   - Internet connectivity');
        console.error('   - Railway database status');
        console.error('   - Database URL configuration');

        // Don't exit the process, just log the error
        console.error('⚠️  Server will continue without database connection');
        return;
      }

      console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Enhanced disconnect function
async function disconnectDB() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error.message);
  }
}

// Graceful shutdown handlers
process.on('beforeExit', async () => {
  console.log('Disconnecting from database...');
  await disconnectDB();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, disconnecting from database...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, disconnecting from database...');
  await disconnectDB();
  process.exit(0);
});

module.exports = { prisma, connectDB };