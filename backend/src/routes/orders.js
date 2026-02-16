const express = require('express');
const https = require('https');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { generateUUID } = require('../utils/uuid');
const receiptService = require('../services/receiptService');

const prisma = new PrismaClient();

// Local payment initialization (removed Paystack integration)
router.post('/initialize-payment', async (req, res) => {
  try {
    const { amount, email, orderData } = req.body;
    
    // For local payments, we just return a mock response
    // The actual payment will be handled through manual confirmation
    const mockReference = `MA-JAF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    res.json({
      status: true,
      message: 'Payment initialized for local processing',
      data: {
        authorization_url: `/payment/local-confirm?reference=${mockReference}`,
        access_code: mockReference,
        reference: mockReference
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Local payment confirmation (replaced Paystack verification)
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { reference, orderData, paymentMethod, paymentDetails } = req.body;
    
    // Check if order already exists with this payment reference
    const existingOrder = await prisma.orders.findFirst({
      where: {
        payment_reference: reference
      },
      include: {
        order_items: {
          include: {
            items: true
          }
        }
      }
    });
    
    if (existingOrder) {
      return res.json({ 
        success: true, 
        data: { status: 'success' }, 
        order: existingOrder,
        message: 'Order already processed'
      });
    }
    
    // Validate required fields
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order data is required'
      });
    }
    
    // Check stock availability for all items before creating order
    const stockValidation = await validateStockAvailability(orderData.items);
    
    if (!stockValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        details: stockValidation.errors
      });
    }
    
    // Create order with local payment confirmation
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.orders.create({
        data: {
          id: generateUUID(),
          user_id: req.user.id,
          order_type: orderData.orderType === 'dine-in' ? 'dine_in' : 'takeaway',
          status: 'confirmed',
          total_amount: orderData.total,
          payment_status: 'completed',
          payment_reference: reference,
          notes: `Customer: ${orderData.customerName || ''}, Table: ${orderData.tableNumber || ''}, Payment: ${paymentMethod} ${paymentDetails ? `(${paymentDetails})` : ''}`,
          order_items: {
            create: orderData.items.map(item => ({
              id: generateUUID(),
              quantity: item.quantity,
              unit_price: item.price,
              subtotal: item.quantity * item.price,
              item_id: item.id
            }))
          }
        },
        include: {
          order_items: {
            include: {
              items: true
            }
          }
        }
      });
      
      // Deduct stock for each item
      for (const item of orderData.items) {
        await tx.items.update({
          where: { id: item.id },
          data: {
            stock_quantity: {
              decrement: item.quantity
            }
          }
        });
        
        // Create inventory history record
        const currentItem = await tx.items.findUnique({
          where: { id: item.id }
        });
        
        await tx.inventory_history.create({
          data: {
            id: generateUUID(),
            item_id: item.id,
            quantity_change: -item.quantity,
            previous_quantity: currentItem.stock_quantity + item.quantity,
            new_quantity: currentItem.stock_quantity,
            reason: `Order ${reference} - ${paymentMethod} Payment`
          }
        });
      }
      
      return newOrder;
    });
    
    // Generate and print receipt
    try {
      const receiptData = {
        order: order,
        items: order.order_items,
        customerName: orderData.customerName,
        tableNumber: orderData.tableNumber,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        reference: reference
      };
      
      await receiptService.processOrderReceipt(receiptData);
      console.log(`Receipt printed for order ${reference}`);
    } catch (receiptError) {
      console.error('Error printing receipt:', receiptError);
      // Don't fail the order if receipt printing fails
    }

    res.json({ 
      success: true, 
      data: { status: 'success' }, 
      order,
      message: 'Payment confirmed and order created'
    });
    
  } catch (error) {
    console.error('Error in payment confirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Helper function to validate stock availability
async function validateStockAvailability(items) {
  const errors = [];
  
  for (const item of items) {
    const dbItem = await prisma.items.findUnique({
      where: { id: item.id },
      select: { id: true, name: true, stock_quantity: true, status: true }
    });
    
    if (!dbItem) {
      errors.push(`Item with ID ${item.id} not found`);
      continue;
    }
    
    if (dbItem.status !== 'active') {
      errors.push(`Item '${dbItem.name}' is not available`);
      continue;
    }
    
    if (dbItem.stock_quantity < item.quantity) {
      errors.push(`Insufficient stock for '${dbItem.name}'. Available: ${dbItem.stock_quantity}, Requested: ${item.quantity}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get all orders with pagination and filters (protected route)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      orderType, 
      startDate, 
      endDate,
      search 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause - filter by current user
    const where = {
      user_id: req.user.id  // Only show orders made by the current user
    };
    
    if (status && status !== 'all') {
      // Map frontend status values to database enum values
      if (status === 'completed') {
        where.status = { in: ['delivered', 'ready'] }; // Consider both delivered and ready as completed
      } else if (status === 'cancelled') {
        where.status = 'cancelled';
      } else {
        // For other statuses, use as-is if they exist in enum
        where.status = status;
      }
    }
    
    if (orderType && orderType !== 'all') {
      where.order_type = orderType === 'dine-in' ? 'dine_in' : orderType;
    }
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        where.created_at.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // Search functionality
    if (search) {
      where.OR = [
        { payment_reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { users: { first_name: { contains: search, mode: 'insensitive' } } },
        { users: { last_name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.orders.findMany({
        where,
        include: {
          order_items: {
            include: {
              items: true
            }
          },
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take
      }),
      prisma.orders.count({ where })
    ]);

    // Transform data to match frontend format
    const transformedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.payment_reference || `ORD-${order.id.slice(-6).toUpperCase()}`,
      customerName: order.users ? `${order.users.first_name} ${order.users.last_name}` : extractCustomerFromNotes(order.notes),
      tableNumber: extractTableFromNotes(order.notes),
      orderType: order.order_type === 'dine_in' ? 'dine-in' : order.order_type,
      items: order.order_items.map(item => ({
        id: item.items?.id || item.item_id,
        name: item.items?.name || 'Unknown Item',
        quantity: item.quantity,
        price: parseFloat(item.unit_price),
        category: item.items?.category || 'Unknown'
      })),
      total: parseFloat(order.total_amount),
      timestamp: order.created_at,
      status: mapOrderStatus(order.status),
      paymentMethod: order.payment_status === 'completed' ? 'transfer' : 'pending',
      staff: 'System', // You can add staff tracking later
      notes: order.notes
    }));

    res.json({
      success: true,
      data: transformedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order statistics (protected route)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build where clause - filter by current user
    const where = {
      user_id: req.user.id  // Only show stats for orders made by the current user
    };
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        where.created_at.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [totalOrders, completedOrders, cancelledOrders, totalRevenue] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.count({ where: { ...where, status: 'delivered' } }),
      prisma.orders.count({ where: { ...where, status: 'cancelled' } }),
      prisma.orders.aggregate({
        where: { ...where, status: 'delivered' },
        _sum: { total_amount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: parseFloat(totalRevenue._sum.total_amount || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    case 'refunded':
      return 'refunded';
    default:
      return 'completed'; // Default for pending/confirmed/preparing/ready
  }
}

// Local payment callback endpoint (no authentication required)
router.get('/payment-callback/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    // Check if order exists with this payment reference
    const existingOrder = await prisma.orders.findFirst({
      where: {
        payment_reference: reference
      },
      include: {
        order_items: {
          include: {
            items: true
          }
        }
      }
    });
    
    if (existingOrder) {
      return res.json({ 
        success: true, 
        data: { status: 'success' }, 
        order: existingOrder,
        message: 'Order found'
      });
    } else {
      return res.json({ 
        success: false, 
        message: 'Order not found or payment not confirmed'
      });
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create cash order endpoint (for POS)
router.post('/create-cash-order', authenticateToken, async (req, res) => {
  try {
    const { orderData } = req.body;
    
    // Validate required fields
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order data and items are required' 
      });
    }

    // Check stock availability for all items before creating order
    const stockValidation = await validateStockAvailability(orderData.items);
    
    if (!stockValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        details: stockValidation.errors
      });
    }

    // Calculate total amount
    const totalAmount = orderData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);

    // Create order in database with 'delivered' status for cash payments
    const order = await prisma.orders.create({
      data: {
        id: generateUUID(), // Add this line
        user_id: req.user.id,
        order_type: orderData.orderType === 'dine-in' ? 'dine_in' : 'takeaway',
        status: 'delivered', 
        total_amount: totalAmount,
        payment_status: 'completed',
        notes: `Customer: ${orderData.customerName || ''}, Table: ${orderData.tableNumber || ''}, Payment: Cash`,
        order_items: {
          create: orderData.items.map(item => ({
            id: generateUUID(), // Add this line
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: item.quantity * item.price,
            item_id: item.id
          }))
        }
      },
      include: {
        order_items: {
          include: {
            items: true
          }
        }
      }
    });

    res.json({ 
      success: true, 
      order,
      message: 'Cash order created successfully'
    });
  } catch (error) {
    console.error('Error creating cash order:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;