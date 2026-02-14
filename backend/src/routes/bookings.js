const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllBookings,
  getBookingStats,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus
} = require('../controllers/bookingsController');

// Get all bookings (Admin only)
router.get('/', authenticateToken, requireAdmin, getAllBookings);

// Get booking statistics (Admin only)
router.get('/stats', authenticateToken, requireAdmin, getBookingStats);

// Create new booking (Admin only)
router.post('/', authenticateToken, requireAdmin, createBooking);

// Update booking (Admin only)
router.put('/:id', authenticateToken, requireAdmin, updateBooking);

// Update booking status (Admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, updateBookingStatus);

// Delete booking (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteBooking);

module.exports = router;