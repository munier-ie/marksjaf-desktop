const { PrismaClient } = require('@prisma/client');
const { generateUUID } = require('../utils/uuid');

const prisma = new PrismaClient();

// Helper function to get date range
const getDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include the entire end date
  return { start, end };
};

// Helper function to format period grouping
const getPeriodGrouping = (period) => {
  switch (period) {
    case 'daily':
      return {
        year: { $year: '$created_at' },
        month: { $month: '$created_at' },
        day: { $dayOfMonth: '$created_at' }
      };
    case 'weekly':
      return {
        year: { $year: '$created_at' },
        week: { $week: '$created_at' }
      };
    case 'monthly':
      return {
        year: { $year: '$created_at' },
        month: { $month: '$created_at' }
      };
    default:
      return {
        year: { $year: '$created_at' },
        month: { $month: '$created_at' },
        day: { $dayOfMonth: '$created_at' }
      };
  }
};

// Get sales report
const getSalesReport = async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    // Default date logic based on period
    let defaultStartDate = new Date();
    if (period === 'yearly') {
      defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 5);
    } else if (period === 'monthly') {
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 12);
    } else if (period === 'weekly') {
      defaultStartDate.setDate(defaultStartDate.getDate() - 90); // ~3 months
    } else {
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    }

    const startDate = req.query.startDate || defaultStartDate.toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    const { start, end } = getDateRange(startDate, endDate);

    // Get orders within date range
    const orders = await prisma.orders.findMany({
      where: {
        created_at: {
          gte: start,
          lte: end
        },
        status: {
          in: ['confirmed', 'delivered', 'ready']
        }
      },
      select: {
        id: true,
        total_amount: true,
        created_at: true,
        order_type: true
      }
    });

    // Group orders by period
    const salesData = {};

    orders.forEach(order => {
      let key;
      const date = new Date(order.created_at);

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!salesData[key]) {
        salesData[key] = {
          date: key,
          totalSales: 0,
          orderCount: 0,
          averageOrderValue: 0
        };
      }

      salesData[key].totalSales += parseFloat(order.total_amount);
      salesData[key].orderCount += 1;
    });

    // Calculate average order values
    Object.keys(salesData).forEach(key => {
      salesData[key].averageOrderValue = salesData[key].totalSales / salesData[key].orderCount;
    });

    // Convert to array and sort by date
    const result = Object.values(salesData).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales report'
    });
  }
};

// Get product performance
const getProductPerformance = async (req, res) => {
  try {
    const { startDate, endDate, category, limit = 20 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const { start, end } = getDateRange(startDate, endDate);

    // Get order items within date range
    const orderItems = await prisma.order_items.findMany({
      where: {
        orders: {
          created_at: {
            gte: start,
            lte: end
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        }
      },
      include: {
        item: {
          include: {
            categories: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Group by product and calculate performance
    const productPerformance = {};

    orderItems.forEach(orderItem => {
      const item = orderItem.item;

      // Filter by category if specified
      if (category && category !== 'all' && item.categories?.name !== category) {
        return;
      }

      if (!productPerformance[item.id]) {
        productPerformance[item.id] = {
          id: item.id,
          name: item.name,
          category: item.categories?.name || 'Uncategorized',
          totalSold: 0,
          revenue: 0
        };
      }

      productPerformance[item.id].totalSold += orderItem.quantity;
      productPerformance[item.id].revenue += parseFloat(orderItem.price) * orderItem.quantity;
    });

    // Convert to array, sort by revenue, and limit results
    const result = Object.values(productPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting product performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product performance'
    });
  }
};

// Get summary statistics
const getSummaryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const { start, end } = getDateRange(startDate, endDate);

    // Get current period stats
    const [currentOrders, currentRevenue, totalCustomers, activeProducts] = await Promise.all([
      // Total orders
      prisma.orders.count({
        where: {
          created_at: {
            gte: start,
            lte: end
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        }
      }),

      // Total revenue
      prisma.orders.aggregate({
        _sum: {
          total_amount: true
        },
        where: {
          created_at: {
            gte: start,
            lte: end
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        }
      }),

      // Total customers (unique users who placed orders)
      prisma.orders.findMany({
        where: {
          created_at: {
            gte: start,
            lte: end
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        },
        select: {
          user_id: true
        },
        distinct: ['user_id']
      }),

      // Active products
      prisma.items.count({
        where: {
          status: 'active'
        }
      })
    ]);

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(start.getTime() - 1);

    const [prevOrders, prevRevenue] = await Promise.all([
      prisma.orders.count({
        where: {
          created_at: {
            gte: prevStart,
            lte: prevEnd
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        }
      }),

      prisma.orders.aggregate({
        _sum: {
          total_amount: true
        },
        where: {
          created_at: {
            gte: prevStart,
            lte: prevEnd
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        }
      })
    ]);

    const currentRevenueValue = parseFloat(currentRevenue._sum.total_amount || 0);
    const prevRevenueValue = parseFloat(prevRevenue._sum.total_amount || 0);

    const revenueGrowth = prevRevenueValue > 0
      ? ((currentRevenueValue - prevRevenueValue) / prevRevenueValue) * 100
      : 0;

    const ordersGrowth = prevOrders > 0
      ? ((currentOrders - prevOrders) / prevOrders) * 100
      : 0;

    const averageOrderValue = currentOrders > 0 ? currentRevenueValue / currentOrders : 0;

    const stats = {
      totalRevenue: currentRevenueValue,
      totalOrders: currentOrders,
      totalCustomers: totalCustomers.length,
      activeProducts,
      averageOrderValue,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      ordersGrowth: Math.round(ordersGrowth * 100) / 100
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting summary stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get summary statistics'
    });
  }
};

// Get customer analytics
const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const { start, end } = getDateRange(startDate, endDate);

    // Get customer data
    const customers = await prisma.users.findMany({
      where: {
        role: 'customer',
        created_at: {
          gte: start,
          lte: end
        }
      },
      include: {
        orders: {
          where: {
            status: {
              in: ['confirmed', 'delivered', 'ready']
            }
          },
          select: {
            total_amount: true,
            created_at: true
          }
        }
      }
    });

    // Calculate customer metrics
    const customerMetrics = customers.map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
      const orderCount = customer.orders.length;
      const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

      return {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        totalSpent,
        orderCount,
        averageOrderValue,
        lastOrderDate: customer.orders.length > 0
          ? Math.max(...customer.orders.map(o => new Date(o.created_at).getTime()))
          : null
      };
    });

    // Sort by total spent
    customerMetrics.sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      success: true,
      data: customerMetrics.slice(0, 50) // Top 50 customers
    });
  } catch (error) {
    console.error('Error getting customer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer analytics'
    });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Default to last 30 days if no dates provided
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    const { start, end } = getDateRange(startDate, endDate);

    // Build where clause
    const whereClause = {};
    if (category && category !== 'all') {
      whereClause.categories = { name: category };
    }

    // Get inventory data
    const items = await prisma.items.findMany({
      where: whereClause,
      include: {
        categories: {
          select: {
            name: true
          }
        },
        order_items: {
          where: {
            orders: {
              created_at: {
                gte: start,
                lte: end
              },
              status: {
                in: ['confirmed', 'delivered', 'ready']
              }
            }
          },
          select: {
            quantity: true,
            unit_price: true
          }
        }
      }
    });

    // Calculate inventory metrics
    const inventoryMetrics = items.map(item => {
      const totalSold = item.order_items.reduce((sum, oi) => sum + oi.quantity, 0);
      const revenue = item.order_items.reduce((sum, oi) => sum + (parseFloat(oi.unit_price) * oi.quantity), 0);
      const turnoverRate = item.stock_quantity > 0 ? totalSold / item.stock_quantity : 0;

      return {
        id: item.id,
        name: item.name,
        category: item.categories?.name || 'Uncategorized',
        currentStock: item.stock_quantity,
        lowStockThreshold: item.low_stock_threshold,
        totalSold,
        revenue,
        turnoverRate,
        stockStatus: item.stock_quantity === 0 ? 'out-of-stock'
          : item.stock_quantity <= item.low_stock_threshold ? 'low-stock'
            : 'in-stock',
        stockValue: item.stock_quantity * parseFloat(item.price)
      };
    });

    // Sort by revenue
    inventoryMetrics.sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: inventoryMetrics
    });
  } catch (error) {
    console.error('Error getting inventory analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory analytics'
    });
  }
};

// Export report data
const exportReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType, format = 'csv' } = req.query;

    if (!startDate || !endDate || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, and report type are required'
      });
    }

    let data = [];
    let headers = [];
    let filename = `${reportType}-report-${startDate}-to-${endDate}`;

    switch (reportType) {
      case 'sales':
        // Get sales data (reuse logic from getSalesReport)
        const salesReq = { query: req.query };
        const salesRes = { json: (data) => data };
        const salesData = await getSalesReport(salesReq, salesRes);

        data = salesData.data || [];
        headers = ['Date', 'Total Sales', 'Order Count', 'Average Order Value'];
        break;

      case 'products':
        // Get product performance data
        const productsReq = { query: req.query };
        const productsRes = { json: (data) => data };
        const productsData = await getProductPerformance(productsReq, productsRes);

        data = productsData.data || [];
        headers = ['Product Name', 'Category', 'Total Sold', 'Revenue'];
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [headers.join(',')];

      data.forEach(row => {
        const values = [];
        switch (reportType) {
          case 'sales':
            values.push(
              row.date,
              row.totalSales,
              row.orderCount,
              row.averageOrderValue
            );
            break;
          case 'products':
            values.push(
              `"${row.name}"`,
              `"${row.category}"`,
              row.totalSold,
              row.revenue
            );
            break;
        }
        csvRows.push(values.join(','));
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON for other formats
      res.json({
        success: true,
        data,
        filename
      });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report'
    });
  }
};

// Get financial summary
const getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const { start, end } = getDateRange(startDate, endDate);

    // Get financial data
    const [revenue, orders, refunds] = await Promise.all([
      // Total revenue
      prisma.orders.aggregate({
        _sum: {
          total_amount: true
        },
        where: {
          created_at: {
            gte: start,
            lte: end
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        },
      }),

      // Order breakdown by payment method
      prisma.orders.groupBy({
        by: ['payment_method'],
        _sum: {
          total_amount: true
        },
        _count: {
          id: true
        },
        where: {
          created_at: {
            gte: start,
            lte: end
          },
          status: {
            in: ['confirmed', 'delivered', 'ready']
          }
        }
      }),

      // Refunds/cancellations
      prisma.orders.aggregate({
        _sum: {
          total_amount: true
        },
        _count: {
          id: true
        },
        where: {
          created_at: {
            gte: start,
            lte: end
          },
          status: 'cancelled'
        }
      })
    ]);

    const financialSummary = {
      totalRevenue: parseFloat(revenue._sum.total_amount || 0),
      paymentMethodBreakdown: orders.map(order => ({
        method: order.payment_method,
        amount: parseFloat(order._sum.total_amount || 0),
        count: order._count.id
      })),
      refunds: {
        amount: parseFloat(refunds._sum.total_amount || 0),
        count: refunds._count.id
      },
      netRevenue: parseFloat(revenue._sum.total_amount || 0) - parseFloat(refunds._sum.total_amount || 0)
    };

    res.json({
      success: true,
      data: financialSummary
    });
  } catch (error) {
    console.error('Error getting financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial summary'
    });
  }
};

// Export dashboard analytics with multi-sheet support
const exportDashboardAnalytics = async (req, res) => {
  try {
    const { format = 'xlsx' } = req.query;
    // Default to last 30 days if no range provided
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

    const { start, end } = getDateRange(startDate, endDate);

    // Fetch all data directly from database
    const [salesOrders, productItems, customers, financialOrders, refunds] = await Promise.all([
      // Sales Data
      prisma.orders.findMany({
        where: {
          created_at: { gte: start, lte: end },
          status: { in: ['confirmed', 'delivered', 'ready'] }
        },
        select: {
          created_at: true,
          total_amount: true
        }
      }),

      // Product Performance
      prisma.order_items.findMany({
        where: {
          orders: {
            created_at: { gte: start, lte: end },
            status: { in: ['confirmed', 'delivered', 'ready'] }
          }
        },
        include: {
          items: {
            include: {
              categories: { select: { name: true } }
            }
          }
        }
      }),

      // Customer Analytics
      prisma.users.findMany({
        where: {
          role: 'customer',
          created_at: { gte: start, lte: end }
        },
        include: {
          orders: {
            where: {
              status: { in: ['confirmed', 'delivered', 'ready'] }
            },
            select: {
              total_amount: true,
              created_at: true
            }
          }
        }
      }),

      // Financial - Revenue
      prisma.orders.aggregate({
        _sum: { total_amount: true },
        where: {
          created_at: { gte: start, lte: end },
          status: { in: ['confirmed', 'delivered', 'ready'] }
        }
      }),

      // Financial - Refunds
      prisma.orders.aggregate({
        _sum: { total_amount: true },
        _count: { id: true },
        where: {
          created_at: { gte: start, lte: end },
          status: 'cancelled'
        }
      })
    ]);

    // Process Sales Data - Group by date
    const salesByDate = {};
    salesOrders.forEach(order => {
      const dateKey = order.created_at.toISOString().split('T')[0];
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          date: dateKey,
          totalSales: 0,
          orderCount: 0,
          averageOrderValue: 0
        };
      }
      salesByDate[dateKey].totalSales += parseFloat(order.total_amount);
      salesByDate[dateKey].orderCount += 1;
    });

    // Calculate average order values
    Object.keys(salesByDate).forEach(key => {
      salesByDate[key].averageOrderValue = salesByDate[key].totalSales / salesByDate[key].orderCount;
    });

    const salesData = Object.values(salesByDate).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Process Product Performance
    const productPerformance = {};
    productItems.forEach(orderItem => {
      const item = orderItem.items;
      if (!productPerformance[item.id]) {
        productPerformance[item.id] = {
          name: item.name,
          category: item.categories?.name || 'Uncategorized',
          totalSold: 0,
          revenue: 0
        };
      }
      productPerformance[item.id].totalSold += orderItem.quantity;
      productPerformance[item.id].revenue += parseFloat(orderItem.price) * orderItem.quantity;
    });

    const productsData = Object.values(productPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 100);

    // Process Customer Analytics
    const customersData = customers.map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
      const orderCount = customer.orders.length;
      return {
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        totalSpent,
        orderCount
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 50);

    // Prepare Data Sets
    const datasets = {
      Sales: salesData.map(s => ({
        Date: s.date,
        'Total Sales': s.totalSales.toFixed(2),
        'Order Count': s.orderCount,
        'Avg Value': s.averageOrderValue.toFixed(2)
      })),
      Products: productsData.map(p => ({
        Product: p.name,
        Category: p.category,
        Sold: p.totalSold,
        Revenue: p.revenue.toFixed(2)
      })),
      Customers: customersData.map(c => ({
        Name: c.name,
        Email: c.email,
        'Total Spent': c.totalSpent.toFixed(2),
        'Orders': c.orderCount
      })),
      Financials: [{
        Metric: 'Total Revenue',
        Value: (parseFloat(financialOrders._sum.total_amount || 0)).toFixed(2)
      }, {
        Metric: 'Net Revenue',
        Value: (parseFloat(financialOrders._sum.total_amount || 0) - parseFloat(refunds._sum.total_amount || 0)).toFixed(2)
      }, {
        Metric: 'Refunds Amount',
        Value: (parseFloat(refunds._sum.total_amount || 0)).toFixed(2)
      }, {
        Metric: 'Refunds Count',
        Value: refunds._count.id
      }]
    };

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();

      Object.entries(datasets).forEach(([name, data]) => {
        if (data.length) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, name);
        }
      });

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-analytics-${startDate}-${endDate}.xlsx"`);
      res.send(buffer);
    } else if (format === 'txt') {
      let content = `DASHBOARD ANALYTICS REPORT (${startDate} to ${endDate})\n\n`;

      Object.entries(datasets).forEach(([name, data]) => {
        content += `=== ${name.toUpperCase()} ===\n`;
        if (data.length === 0) content += "No data available.\n";
        else {
          const headers = Object.keys(data[0]);
          content += headers.join(' | ') + '\n';
          content += '-'.repeat(50) + '\n';
          data.forEach(row => {
            content += headers.map(h => row[h]).join(' | ') + '\n';
          });
        }
        content += '\n\n';
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-analytics-${startDate}-${endDate}.txt"`);
      res.send(content);
    } else {
      // CSV - Sales data
      const headers = ['Date', 'Total Sales', 'Order Count', 'Avg Value'];
      const csvContent = [
        headers.join(','),
        ...datasets.Sales.map(row => `${row.Date},${row['Total Sales']},${row['Order Count']},${row['Avg Value']}`)
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-sales-${startDate}-${endDate}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Error exporting dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to export dashboard', error: error.message });
  }
};

module.exports = {
  getSalesReport,
  getProductPerformance,
  getSummaryStats,
  getCustomerAnalytics,
  getInventoryAnalytics,
  exportReport,
  getFinancialSummary,
  exportDashboardAnalytics
};