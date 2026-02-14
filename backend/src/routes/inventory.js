const express = require('express');
const router = express.Router();
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');
const {
  getInventoryStats,
  getCategoryStats,
  getStockMovements,
  getLowStockItems,
  updateStock,
  bulkUpdateItems,
  exportInventory
} = require('../controllers/inventoryController');

// Apply authentication to all routes
router.use(authenticateToken);

// Inventory statistics (staff and admin)
router.get('/stats', requireStaff, getInventoryStats);

// Category statistics (staff and admin)
router.get('/categories/stats', requireStaff, getCategoryStats);

// Stock movements (staff and admin)
router.get('/movements', requireStaff, getStockMovements);

// Low stock items (staff and admin)
router.get('/low-stock', requireStaff, getLowStockItems);

// Update stock quantity (staff and admin)
router.patch('/:id/stock', requireStaff, updateStock);

// Bulk update items (admin only)
router.patch('/bulk-update', requireAdmin, bulkUpdateItems);

// Export inventory data (admin only)
router.get('/export', requireAdmin, exportInventory);

module.exports = router;