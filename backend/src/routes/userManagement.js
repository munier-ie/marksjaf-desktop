const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userManagementController');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// User management routes
router.get('/stats', getUserStats);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;