const { PrismaClient } = require('@prisma/client');
const { generateUUID } = require('../utils/uuid');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

// Get inventory statistics
const getInventoryStats = async (req, res) => {
  try {
    const [totalItems, totalValue, lowStockItems, outOfStockItems, activeItems, inactiveItems] = await Promise.all([
      // Total items count
      prisma.items.count(),
      
      // Total inventory value
      prisma.items.aggregate({
        _sum: {
          price: true
        },
        where: {
          status: 'active'
        }
      }),
      
      // Low stock items (stock <= threshold but > 0)
      prisma.items.count({
        where: {
          AND: [
            { stock_quantity: { lte: prisma.items.fields.low_stock_threshold } },
            { stock_quantity: { gt: 0 } },
            { status: 'active' }
          ]
        }
      }),
      
      // Out of stock items
      prisma.items.count({
        where: {
          stock_quantity: 0,
          status: 'active'
        }
      }),
      
      // Active items
      prisma.items.count({
        where: { status: 'active' }
      }),
      
      // Inactive items
      prisma.items.count({
        where: { status: { not: 'active' } }
      })
    ]);

    // Calculate average price and total stock quantity
    const itemsWithStock = await prisma.items.findMany({
      select: {
        price: true,
        stock_quantity: true
      },
      where: {
        status: 'active'
      }
    });

    const totalStockQuantity = itemsWithStock.reduce((sum, item) => sum + item.stock_quantity, 0);
    const totalInventoryValue = itemsWithStock.reduce((sum, item) => sum + (item.price * item.stock_quantity), 0);
    const averagePrice = itemsWithStock.length > 0 ? itemsWithStock.reduce((sum, item) => sum + item.price, 0) / itemsWithStock.length : 0;

    const stats = {
      totalItems,
      totalValue: totalInventoryValue,
      lowStockItems,
      outOfStockItems,
      activeItems,
      inactiveItems,
      averagePrice,
      totalStockQuantity
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory statistics'
    });
  }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        items: {
          select: {
            id: true,
            price: true,
            stock_quantity: true,
            low_stock_threshold: true,
            status: true
          }
        }
      }
    });

    const categoryStats = categories.map(category => {
      const activeItems = category.items.filter(item => item.status === 'active');
      const totalValue = activeItems.reduce((sum, item) => sum + (item.price * item.stock_quantity), 0);
      const lowStockCount = activeItems.filter(item => 
        item.stock_quantity <= item.low_stock_threshold && item.stock_quantity > 0
      ).length;

      return {
        name: category.name,
        itemCount: activeItems.length,
        totalValue,
        lowStockCount
      };
    });

    // Sort by total value descending
    categoryStats.sort((a, b) => b.totalValue - a.totalValue);

    res.json({
      success: true,
      categories: categoryStats
    });
  } catch (error) {
    console.error('Error getting category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category statistics'
    });
  }
};

// Get stock movements (mock data for now - in real app, you'd track these)
const getStockMovements = async (req, res) => {
  try {
    const { timeRange = '30d', category = 'all' } = req.query;
    
    // Calculate date range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // For now, return mock data. In a real application, you'd have a stock_movements table
    const mockMovements = [
      {
        date: new Date().toISOString().split('T')[0],
        itemName: 'Jollof Rice',
        type: 'out',
        quantity: 5,
        reason: 'Sale'
      },
      {
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        itemName: 'Chicken Shawarma',
        type: 'in',
        quantity: 20,
        reason: 'Restock'
      },
      {
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        itemName: 'Zobo Drink',
        type: 'adjustment',
        quantity: -2,
        reason: 'Inventory correction'
      }
    ];

    res.json({
      success: true,
      movements: mockMovements
    });
  } catch (error) {
    console.error('Error getting stock movements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock movements'
    });
  }
};

// Get low stock items
const getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await prisma.items.findMany({
      where: {
        OR: [
          {
            AND: [
              { stock_quantity: { lte: prisma.items.fields.low_stock_threshold } },
              { stock_quantity: { gt: 0 } }
            ]
          },
          { stock_quantity: 0 }
        ],
        status: 'active'
      },
      include: {
        categories: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { stock_quantity: 'asc' },
        { name: 'asc' }
      ]
    });

    const formattedItems = lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      stock_quantity: item.stock_quantity,
      low_stock_threshold: item.low_stock_threshold,
      price: item.price,
      category_name: item.categories?.name,
      status: item.status
    }));

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error getting low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get low stock items'
    });
  }
};

// Update stock quantity
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity provided'
      });
    }

    const updatedItem = await prisma.items.update({
      where: { id },
      data: {
        stock_quantity: quantity,
        updated_at: new Date()
      },
      include: {
        categories: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Stock updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
};

// Bulk update items
const bulkUpdateItems = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates data'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, ...updateData } = update;
        
        const updatedItem = await prisma.items.update({
          where: { id },
          data: {
            ...updateData,
            updated_at: new Date()
          }
        });
        
        results.push(updatedItem);
      } catch (error) {
        errors.push({
          id: update.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Updated ${results.length} items successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error bulk updating items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update items'
    });
  }
};

// Export inventory data
const exportInventory = async (req, res) => {
  try {
    const { format = 'csv', category, status } = req.query;
    
    const whereClause = {};
    if (category && category !== 'all') {
      whereClause.categories = { name: category };
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const items = await prisma.items.findMany({
      where: whereClause,
      include: {
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

    if (format === 'csv') {
      const csvHeaders = ['ID', 'Name', 'Description', 'Price', 'Stock Quantity', 'Low Stock Threshold', 'Status', 'Type', 'Category', 'Created At', 'Updated At'];
      const csvRows = items.map(item => [
        item.id,
        `"${item.name}"`,
        `"${item.description || ''}"`,
        item.price,
        item.stock_quantity,
        item.low_stock_threshold,
        item.status,
        item.type,
        `"${item.categories?.name || 'N/A'}"`,
        item.created_at.toISOString(),
        item.updated_at.toISOString()
      ]);
      
      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: items,
        count: items.length
      });
    }
  } catch (error) {
    console.error('Error exporting inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export inventory data'
    });
  }
};

module.exports = {
  getInventoryStats,
  getCategoryStats,
  getStockMovements,
  getLowStockItems,
  updateStock,
  bulkUpdateItems,
  exportInventory
};