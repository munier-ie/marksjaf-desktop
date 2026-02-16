const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload } = require('../config/localStorage');
const localImageService = require('../services/localImageService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Add bookings controller import
const {
  getAllBookings,
  getBookingStats,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  exportBookings
} = require('../controllers/bookingsController');

const {
  getSalesReport,
  getProductPerformance,
  getSummaryStats,
  getCustomerAnalytics,
  getInventoryAnalytics,
  exportReport,
  getFinancialSummary,
  exportDashboardAnalytics
} = require('../controllers/reportsController');

const {
  getAllTransactions,
  getTransactionStats,
  deleteTransaction,
  cancelTransaction,
  exportTransactions
} = require('../controllers/transactionsController');
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getInventoryStats,
  importItems
} = require('../controllers/adminInventoryController');

const router = express.Router();
const prisma = new PrismaClient();
const { generateUUID } = require('../utils/uuid');

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// Add bookings routes
router.get('/bookings', getAllBookings);
router.get('/bookings/stats', getBookingStats);
router.get('/bookings/export', exportBookings); // New route
router.post('/bookings', createBooking);
router.put('/bookings/:id', updateBooking);
router.patch('/bookings/:id/status', updateBookingStatus);
router.delete('/bookings/:id', deleteBooking);

// Add transactions routes
router.get('/transactions', getAllTransactions);
router.get('/transactions/stats', getTransactionStats);
router.get('/transactions/export', exportTransactions); // New route
router.delete('/transactions/:id', deleteTransaction);
router.put('/transactions/:id/cancel', cancelTransaction);

// Dashboard routes
router.get('/dashboard/sales', getSalesReport);
// router.get('/dashboard/inventory', getInventoryAnalytics);
router.get('/dashboard/export', exportDashboardAnalytics); // New route

// Inventory Management Routes
router.get('/inventory', getAllItems);
router.get('/inventory/stats', getInventoryStats);
router.get('/inventory/:id', getItemById);
router.post('/inventory', upload.single('image'), createItem);
router.put('/inventory/:id', upload.single('image'), updateItem);
router.delete('/inventory/:id', deleteItem);
router.post('/inventory/import', upload.single('file'), importItems);

// Image upload route
router.post('/inventory/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await localImageService.processAndSaveImage(req.file, 'items');

    if (result.success) {
      res.json({
        success: true,
        data: {
          imageUrl: result.imageUrl,
          filename: result.filename,
          size: result.size
        }
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Categories routes
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // In category creation route (around line 70):
    const category = await prisma.categories.create({
      data: {
        id: generateUUID(), // Add this line
        name,
        description
      }
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Dashboard Overview Stats
router.get('/dashboard/overview', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [todayOrders, todayRevenue, pendingOrders, completedOrders] = await Promise.all([
      // Today's orders count
      prisma.orders.count({
        where: {
          created_at: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),

      // Today's revenue
      prisma.orders.aggregate({
        where: {
          created_at: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'delivered'
        },
        _sum: { total_amount: true }
      }),

      // Pending orders
      prisma.orders.count({
        where: {
          status: { in: ['pending', 'confirmed', 'preparing'] }
        }
      }),

      // Completed orders today
      prisma.orders.count({
        where: {
          created_at: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'delivered'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: parseFloat(todayRevenue._sum.total_amount || 0),
        pendingOrders,
        completedOrders
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive Dashboard Statistics - NEW ENDPOINT
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalRevenue,
      totalOrders,
      totalBookings,
      totalInventoryItems,
      lowStockItems,
      outOfStockItems,
      totalTransactions,
      completedOrders
    ] = await Promise.all([
      // Total Revenue (all completed orders)
      prisma.orders.aggregate({
        where: {
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        },
        _sum: { total_amount: true }
      }),

      // Total Orders Count
      prisma.orders.count(),

      // Total Bookings Count
      prisma.consultancy_bookings.count(),

      // Total Inventory Items
      prisma.items.count({
        where: {
          status: { in: ['active', 'out_of_stock'] }
        }
      }),

      // Low Stock Items (below threshold)
      prisma.items.count({
        where: {
          status: 'active',
          stock_quantity: {
            lte: prisma.items.fields.low_stock_threshold
          }
        }
      }),

      // Out of Stock Items
      prisma.items.count({
        where: {
          OR: [
            { status: 'out_of_stock' },
            { stock_quantity: 0 }
          ]
        }
      }),

      // Total Transactions (completed payments)
      prisma.orders.count({
        where: {
          payment_status: 'completed'
        }
      }),

      // Completed Orders
      prisma.orders.count({
        where: {
          status: 'delivered'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue._sum.total_amount || 0),
        totalOrders,
        totalBookings,
        totalTransactions,
        completedOrders,
        inventory: {
          totalItems: totalInventoryItems,
          lowStockItems,
          outOfStockItems
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recent Orders for Dashboard
router.get('/dashboard/recent-orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const orders = await prisma.orders.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        },
        order_items: {
          include: {
            items: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      }
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      customerName: order.users ? `${order.users.first_name} ${order.users.last_name}` : extractCustomerFromNotes(order.notes),
      customerEmail: order.users?.email,
      orderType: order.order_type,
      status: mapOrderStatus(order.status),
      total: parseFloat(order.total_amount),
      paymentStatus: order.payment_status,
      timestamp: order.created_at,
      items: order.order_items.map(item => ({
        name: item.items.name,
        quantity: item.quantity
      })),
      tableNumber: extractTableFromNotes(order.notes)
    }));

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sales Analytics Endpoint - FIXED VERSION
router.get('/dashboard/sales', async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    const limitNum = parseInt(limit);

    let salesData;
    const now = new Date();

    switch (period) {
      case 'daily':
        // Get daily sales for the last 30 days from orders table
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const dailyOrders = await prisma.orders.findMany({
          where: {
            created_at: {
              gte: thirtyDaysAgo,
              lte: now
            },
            status: {
              in: ['confirmed', 'delivered', 'ready'] // Fixed: use correct status values
            }
          },
          select: {
            created_at: true,
            total_amount: true
          }
        });

        // Group by date (remove time component)
        const dailyData = {};
        dailyOrders.forEach(order => {
          const dateKey = order.created_at.toISOString().split('T')[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              date: new Date(dateKey),
              total_orders: 0,
              total_revenue: 0
            };
          }
          dailyData[dateKey].total_orders += 1;
          dailyData[dateKey].total_revenue += parseFloat(order.total_amount);
        });

        salesData = Object.values(dailyData)
          .sort((a, b) => a.date - b.date)
          .slice(-limitNum);
        break;

      case 'weekly':
        // Get weekly sales for the last 12 weeks
        const twelveWeeksAgo = new Date(now.getTime() - (12 * 7 * 24 * 60 * 60 * 1000));

        const weeklyOrders = await prisma.orders.findMany({
          where: {
            created_at: {
              gte: twelveWeeksAgo,
              lte: now
            },
            status: {
              in: ['confirmed', 'delivered', 'ready'] // Fixed: use correct status values
            }
          },
          select: {
            created_at: true,
            total_amount: true
          }
        });

        // Group by week
        const weeklyData = {};
        weeklyOrders.forEach(order => {
          const weekStart = getWeekStart(order.created_at);
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
              date: weekStart,
              total_orders: 0,
              total_revenue: 0
            };
          }

          weeklyData[weekKey].total_orders += 1;
          weeklyData[weekKey].total_revenue += parseFloat(order.total_amount);
        });

        salesData = Object.values(weeklyData)
          .sort((a, b) => a.date - b.date)
          .slice(-limitNum);
        break;

      case 'monthly':
        // Get monthly sales for the last 12 months
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

        const monthlyOrders = await prisma.orders.findMany({
          where: {
            created_at: {
              gte: twelveMonthsAgo,
              lte: now
            },
            status: {
              in: ['confirmed', 'delivered', 'ready'] // Fixed: use correct status values
            }
          },
          select: {
            created_at: true,
            total_amount: true
          }
        });

        // Group by month
        const monthlyData = {};
        monthlyOrders.forEach(order => {
          const monthKey = `${order.created_at.getFullYear()}-${String(order.created_at.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              date: new Date(order.created_at.getFullYear(), order.created_at.getMonth(), 1),
              total_orders: 0,
              total_revenue: 0
            };
          }

          monthlyData[monthKey].total_orders += 1;
          monthlyData[monthKey].total_revenue += parseFloat(order.total_amount);
        });

        salesData = Object.values(monthlyData)
          .sort((a, b) => a.date - b.date)
          .slice(-limitNum);
        break;

      case 'yearly':
        // Get yearly sales for the last 5 years
        const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);

        const yearlyOrders = await prisma.orders.findMany({
          where: {
            created_at: {
              gte: fiveYearsAgo,
              lte: now
            },
            status: {
              in: ['confirmed', 'delivered', 'ready'] // Fixed: use correct status values
            }
          },
          select: {
            created_at: true,
            total_amount: true
          }
        });

        // Group by year
        const yearlyData = {};
        yearlyOrders.forEach(order => {
          const yearKey = order.created_at.getFullYear().toString();

          if (!yearlyData[yearKey]) {
            yearlyData[yearKey] = {
              date: new Date(order.created_at.getFullYear(), 0, 1),
              total_orders: 0,
              total_revenue: 0
            };
          }

          yearlyData[yearKey].total_orders += 1;
          yearlyData[yearKey].total_revenue += parseFloat(order.total_amount);
        });

        salesData = Object.values(yearlyData)
          .sort((a, b) => a.date - b.date)
          .slice(-limitNum);
        break;

      default:
        return res.status(400).json({ error: 'Invalid period. Use: daily, weekly, monthly, or yearly' });
    }

    // Format the response
    const formattedData = salesData.map(item => ({
      date: item.date,
      orders: item.total_orders,
      revenue: parseFloat(item.total_revenue || 0)
    }));

    res.json({
      success: true,
      data: {
        period,
        salesData: formattedData,
        totalRecords: formattedData.length
      }
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Inventory Status Endpoint - NEW ENDPOINT
router.get('/dashboard/inventory', async (req, res) => {
  try {
    // Get total inventory count
    const totalItems = await prisma.items.count({
      where: {
        status: 'active'
      }
    });

    // Get low stock items (stock_quantity <= 10)
    const lowStockItems = await prisma.items.findMany({
      where: {
        status: 'active',
        stock_quantity: {
          lte: 10,
          gt: 0
        }
      },
      select: {
        id: true,
        name: true,
        stock_quantity: true,
        price: true,
        categories: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        stock_quantity: 'asc'
      }
    });

    // Get out of stock items (stock_quantity = 0)
    const outOfStockItems = await prisma.items.findMany({
      where: {
        status: 'active',
        stock_quantity: 0
      },
      select: {
        id: true,
        name: true,
        stock_quantity: true,
        price: true,
        categories: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get inventory by category
    const inventoryByCategory = await prisma.categories.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            items: {
              where: {
                status: 'active'
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calculate total inventory value
    const inventoryValue = await prisma.items.aggregate({
      where: {
        status: 'active'
      },
      _sum: {
        stock_quantity: true
      }
    });

    // Get average stock level
    const avgStock = await prisma.items.aggregate({
      where: {
        status: 'active',
        stock_quantity: {
          gt: 0
        }
      },
      _avg: {
        stock_quantity: true
      }
    });

    // Format the response
    const formattedLowStock = lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      stock: item.stock_quantity,
      price: parseFloat(item.price),
      category: item.categories?.name || 'Uncategorized'
    }));

    const formattedOutOfStock = outOfStockItems.map(item => ({
      id: item.id,
      name: item.name,
      stock: item.stock_quantity,
      price: parseFloat(item.price),
      category: item.categories?.name || 'Uncategorized'
    }));

    const formattedCategories = inventoryByCategory.map(category => ({
      id: category.id,
      name: category.name,
      itemCount: category._count.items
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStockItems.length,
          totalStockUnits: inventoryValue._sum.stock_quantity || 0,
          averageStockLevel: Math.round(avgStock._avg.stock_quantity || 0)
        },
        lowStockItems: formattedLowStock,
        outOfStockItems: formattedOutOfStock,
        categoriesBreakdown: formattedCategories
      }
    });

  } catch (error) {
    console.error('Error fetching inventory status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function for week calculation
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Helper functions
function extractCustomerFromNotes(notes) {
  if (!notes) return 'Unknown Customer';
  const customerMatch = notes.match(/Customer: ([^,]+)/);
  return customerMatch ? customerMatch[1].trim() : 'Unknown Customer';
}

function extractTableFromNotes(notes) {
  if (!notes) return null;
  const tableMatch = notes.match(/Table: ([^,]+)/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function mapOrderStatus(dbStatus) {
  switch (dbStatus) {
    case 'delivered':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'confirmed':
      return 'preparing';
    case 'ready':
      return 'ready';
    default:
      return dbStatus;
  }
}

module.exports = router;