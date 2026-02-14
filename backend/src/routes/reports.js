const express = require('express');
const router = express.Router();
const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');
const {
  getSalesReport,
  getProductPerformance,
  getSummaryStats,
  getCustomerAnalytics,
  getInventoryAnalytics,
  exportReport,
  getFinancialSummary
} = require('../controllers/reportsController');

// Apply authentication to all routes
router.use(authenticateToken);

// Sales reports (staff and admin)
router.get('/sales', requireStaff, getSalesReport);

// Product performance reports (staff and admin)
router.get('/products', requireStaff, getProductPerformance);

// Summary statistics (staff and admin)
router.get('/summary', requireStaff, getSummaryStats);

// Customer analytics (admin only)
router.get('/customers', requireAdmin, getCustomerAnalytics);

// Inventory analytics (staff and admin)
router.get('/inventory', requireStaff, getInventoryAnalytics);

// Financial summary (admin only)
router.get('/financial', requireAdmin, getFinancialSummary);

// Export reports (admin only)
router.get('/export', requireAdmin, exportReport);

module.exports = router;