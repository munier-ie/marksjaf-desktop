const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all transactions with filtering and pagination (Admin only)
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      paymentMethod,
      orderType,
      startDate,
      endDate,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for all users (admin view)
    const where = {};

    if (status && status !== 'all') {
      if (status === 'completed') {
        where.status = { in: ['delivered', 'ready'] };
        where.payment_status = 'completed';
      } else if (status === 'failed') {
        where.payment_status = 'failed';
      } else if (status === 'refunded') {
        where.payment_status = 'refunded';
      } else if (status === 'pending') {
        where.payment_status = 'pending';
      }
    }

    if (orderType && orderType !== 'all') {
      where.order_type = orderType === 'dine-in' ? 'dine_in' : orderType;
    }

    // Payment method filtering (stored in notes)
    if (paymentMethod && paymentMethod !== 'all') {
      // Create a case-insensitive search for the payment method in notes
      // Common format is "Payment: Method"
      where.notes = {
        contains: paymentMethod,
        mode: 'insensitive'
      };
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
      const searchNumber = parseFloat(search);
      const isNumber = !isNaN(searchNumber);

      where.OR = [
        { payment_reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          users: {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ];

      // Add amount search if input is a valid number
      if (isNumber) {
        where.OR.push({ total_amount: { equals: searchNumber } });
      }
    }

    const [transactions, totalCount] = await Promise.all([
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

    // Transform data to match frontend Transaction interface
    const transformedTransactions = transactions.map(order => ({
      id: order.id,
      orderNumber: order.payment_reference || `ORD-${order.id.slice(-6).toUpperCase()}`,
      customerName: order.users ? `${order.users.first_name} ${order.users.last_name}` : extractCustomerFromNotes(order.notes),
      tableNumber: extractTableFromNotes(order.notes),
      orderType: order.order_type === 'dine_in' ? 'dine-in' : order.order_type,
      amount: parseFloat(order.total_amount),
      paymentMethod: determinePaymentMethod(order),
      status: mapTransactionStatus(order),
      timestamp: order.created_at,
      items: order.order_items.map(item => ({
        name: item.items?.name || 'Unknown Item',
        quantity: item.quantity,
        price: parseFloat(item.unit_price)
      })),
      staff: 'System', // Can be enhanced later with actual staff tracking
      notes: order.notes
    }));

    res.json({
      success: true,
      data: {
        transactions: transformedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Get transaction statistics (Admin only)
const getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        where.created_at.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [totalTransactions, completedTransactions, failedTransactions, refundedTransactions, totalRevenue] = await Promise.all([
      prisma.orders.count({ where }),
      prisma.orders.count({
        where: {
          ...where,
          payment_status: 'completed',
          status: { in: ['delivered', 'ready'] }
        }
      }),
      prisma.orders.count({ where: { ...where, payment_status: 'failed' } }),
      prisma.orders.count({ where: { ...where, payment_status: 'refunded' } }),
      prisma.orders.aggregate({
        where: {
          ...where,
          payment_status: { notIn: ['failed', 'refunded'] }
        },
        _sum: { total_amount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalTransactions,
        totalAmount: parseFloat(totalRevenue._sum.total_amount || 0),
        completed: completedTransactions,
        failed: failedTransactions,
        refunded: refundedTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics',
      error: error.message
    });
  }
};

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

function determinePaymentMethod(order) {
  // Determine payment method based on order data
  if (order.payment_method) {
    return order.payment_method;
  }
  // Default based on payment status for legacy orders
  return order.payment_status === 'completed' ? 'cash' : 'pending';
}

function mapTransactionStatus(order) {
  // Check payment status first
  if (order.payment_status === 'failed') return 'failed';
  if (order.payment_status === 'refunded') return 'refunded';

  // For completed payments, check order status
  if (order.payment_status === 'completed') {
    // If payment is completed, the transaction is effectively completed for accounting purposes
    // ensuring it shows as "Completed" in the UI as requested
    return 'completed';
  }

  // For pending payments, check if order is progressing
  if (order.payment_status === 'pending') {
    if (['confirmed', 'preparing', 'ready'].includes(order.status)) {
      // Even if payment is pending, if the order is being made, we treat it as active/processing
      // But the user request specifically asked to "mark/make each transaction sale as completed instead of processing"
      // So we'll map what used to be 'processing' to 'completed' if that's the desired behavior for all "sales"
      // However, usually "pending payment" shouldn't be "completed". 
      // The request likely refers to paid orders that were showing as processing.
      // So ensuring paid orders are 'completed' (above) covers the main case.
      // unique case: pay on delivery/eating.
      return 'pending';
    }
    return 'pending';
  }

  return 'pending';
}

// Delete transaction (Admin only)
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: true
      }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction can be deleted (only pending or failed transactions)
    if (existingTransaction.payment_status === 'completed' &&
      ['delivered', 'ready'].includes(existingTransaction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed transactions'
      });
    }

    // Use a transaction to delete order items first, then the order
    await prisma.$transaction(async (tx) => {
      // Delete all order items first
      await tx.order_items.deleteMany({
        where: { order_id: id }
      });

      // Then delete the order
      await tx.orders.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: error.message
    });
  }
};

// Cancel transaction (Admin only)
const cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction exists
    const existingTransaction = await prisma.orders.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction can be cancelled (only pending transactions)
    if (existingTransaction.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be cancelled'
      });
    }

    // Update transaction status to cancelled
    await prisma.orders.update({
      where: { id },
      data: {
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Transaction cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transaction',
      error: error.message
    });
  }
};

// Export transactions
const exportTransactions = async (req, res) => {
  try {
    const {
      format = 'csv',
      status,
      paymentMethod,
      startDate,
      endDate,
      search
    } = req.query;

    // Reuse existing filtering logic from getAllTransactions
    const where = {};

    if (status && status !== 'all') {
      if (status === 'completed') {
        where.status = { in: ['delivered', 'ready'] };
        where.payment_status = 'completed';
      } else if (status === 'failed') {
        where.payment_status = 'failed';
      } else if (status === 'refunded') {
        where.payment_status = 'refunded';
      } else if (status === 'pending') {
        where.payment_status = 'pending';
      }
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.notes = { contains: paymentMethod, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      const searchNumber = parseFloat(search);
      const isNumber = !isNaN(searchNumber);
      where.OR = [
        { payment_reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { users: { OR: [{ first_name: { contains: search, mode: 'insensitive' } }, { last_name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } }
      ];
      if (isNumber) where.OR.push({ total_amount: { equals: searchNumber } });
    }

    const transactions = await prisma.orders.findMany({
      where,
      include: {
        users: { select: { first_name: true, last_name: true, email: true } },
        order_items: { include: { items: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const data = transactions.map(t => ({
      Date: new Date(t.created_at).toLocaleString(),
      OrderNumber: t.payment_reference || `ORD-${t.id.slice(-6).toUpperCase()}`,
      Customer: t.users ? `${t.users.first_name} ${t.users.last_name}` : extractCustomerFromNotes(t.notes),
      Amount: parseFloat(t.total_amount),
      Status: mapTransactionStatus(t),
      PaymentMethod: determinePaymentMethod(t),
      Items: t.order_items.map(i => `${i.quantity}x ${i.items?.name}`).join(', '),
      Notes: t.notes || ''
    }));

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } else {
      // CSV Export
      const headers = ['Date', 'OrderNumber', 'Customer', 'Amount', 'Status', 'PaymentMethod', 'Items', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to export transactions' });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionStats,
  deleteTransaction,
  cancelTransaction,
  exportTransactions
};