const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateUUID } = require('../utils/uuid');

// Get all bookings (Admin only)
const getAllBookings = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.session_datetime = {};
      if (startDate) {
        where.session_datetime.gte = new Date(startDate);
      }
      if (endDate) {
        where.session_datetime.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const bookings = await prisma.consultancy_bookings.findMany({
      where,
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        }
      },
      orderBy: {
        session_datetime: 'desc'
      }
    });

    // Transform data to match frontend interface
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      user_id: booking.user_id,
      customer_name: booking.users ? `${booking.users.first_name} ${booking.users.last_name}` : 'Unknown Customer',
      phone_number: booking.phone_number || booking.users?.phone_number || '',
      email: booking.users?.email || '',
      consultancy_type: booking.consultancy_type || 'General Consultation',
      session_datetime: booking.session_datetime,
      description: booking.description || booking.notes || '',
      amount: booking.amount || 0,
      duration_minutes: booking.duration_minutes || 60,
      status: booking.status,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    }));

    res.json({
      success: true,
      data: transformedBookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// Get booking statistics (Admin only)
const getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.session_datetime = {};
      if (startDate) {
        where.session_datetime.gte = new Date(startDate);
      }
      if (endDate) {
        where.session_datetime.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [totalBookings, confirmedBookings, pendingBookings, todayBookings] = await Promise.all([
      prisma.consultancy_bookings.count({ where }),
      prisma.consultancy_bookings.count({
        where: {
          ...where,
          status: 'confirmed'
        }
      }),
      prisma.consultancy_bookings.count({
        where: {
          ...where,
          status: 'pending'
        }
      }),
      prisma.consultancy_bookings.count({
        where: {
          ...where,
          session_datetime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        today: todayBookings
      }
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics',
      error: error.message
    });
  }
};

// Create new booking (Admin only)
const createBooking = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      consultancyType,
      date,
      time,
      status,
      specialRequests,
      duration = 60,
      amount = 20000
    } = req.body;

    // Combine date and time
    const sessionDateTime = new Date(`${date}T${time}:00.000Z`);

    // Create user if email is provided and doesn't exist
    let userId = null;
    if (customerEmail) {
      const existingUser = await prisma.users.findUnique({
        where: { email: customerEmail }
      });

      if (existingUser) {
        userId = existingUser.id;
      }
    }

    // In createBooking function (around line 165):
    const booking = await prisma.consultancy_bookings.create({
      data: {
        id: generateUUID(), // Add this line
        user_id: userId,
        consultancy_type: consultancyType || 'General',
        session_datetime: sessionDateTime,
        status: status || 'pending',
        description: specialRequests,
        notes: specialRequests,
        phone_number: customerPhone,
        duration_minutes: duration,
        amount: amount,
        payment_status: 'pending'
      },
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
};

// Update booking (Admin only)
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      customerPhone,
      customerEmail,
      consultancyType,
      date,
      time,
      status,
      specialRequests,
      duration,
      amount
    } = req.body;

    // Check if booking exists
    const existingBooking = await prisma.consultancy_bookings.findUnique({
      where: { id }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Combine date and time
    const sessionDateTime = new Date(`${date}T${time}:00.000Z`);

    const updatedBooking = await prisma.consultancy_bookings.update({
      where: { id },
      data: {
        consultancy_type: consultancyType,
        session_datetime: sessionDateTime,
        status,
        description: specialRequests,
        notes: specialRequests,
        phone_number: customerPhone,
        duration_minutes: duration,
        amount
      },
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message
    });
  }
};

// Delete booking (Admin only)
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists
    const existingBooking = await prisma.consultancy_bookings.findUnique({
      where: { id }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await prisma.consultancy_bookings.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
      error: error.message
    });
  }
};

// Update booking status (Admin only)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if booking exists
    const existingBooking = await prisma.consultancy_bookings.findUnique({
      where: { id }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const updatedBooking = await prisma.consultancy_bookings.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};

// Export bookings
const exportBookings = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, status } = req.query;
    const where = {};

    if (startDate || endDate) {
      where.session_datetime = {};
      if (startDate) where.session_datetime.gte = new Date(startDate);
      if (endDate) where.session_datetime.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (status && status !== 'all') where.status = status;

    const bookings = await prisma.consultancy_bookings.findMany({
      where,
      include: {
        users: { select: { first_name: true, last_name: true, email: true, phone_number: true } }
      },
      orderBy: { session_datetime: 'desc' }
    });

    const data = bookings.map(b => ({
      Date: new Date(b.session_datetime).toLocaleString(),
      Customer: b.users ? `${b.users.first_name} ${b.users.last_name}` : 'Unknown',
      Type: b.consultancy_type,
      Status: b.status,
      Amount: b.amount,
      Duration: `${b.duration_minutes} mins`,
      Phone: b.phone_number || b.users?.phone_number || '',
      Email: b.users?.email || '',
      Notes: b.description || ''
    }));

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } else {
      // CSV Export
      const headers = ['Date', 'Customer', 'Type', 'Status', 'Amount', 'Duration', 'Phone', 'Email', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Error exporting bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to export bookings' });
  }
};

module.exports = {
  getAllBookings,
  getBookingStats,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  exportBookings
};