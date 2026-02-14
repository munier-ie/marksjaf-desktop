const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getAllTransactions, getTransactionStats, deleteTransaction, cancelTransaction } = require('../controllers/transactionsController');

// Get transaction statistics
router.get('/stats', authenticateToken, requireAdmin, getTransactionStats);

// Get all transactions with filtering
router.get('/', authenticateToken, requireAdmin, getAllTransactions);

// Cancel transaction
router.put('/:id/cancel', authenticateToken, requireAdmin, cancelTransaction);

// Delete transaction
router.delete('/:id', authenticateToken, requireAdmin, deleteTransaction);

module.exports = router;