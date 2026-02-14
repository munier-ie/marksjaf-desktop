const express = require('express');
const router = express.Router();
const receiptService = require('../services/receiptService');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// Test print endpoint
router.post('/test-print', authenticateToken, async (req, res) => {
  try {
    const { printerName } = req.body;  // Optional: specify printer

    // Generate test receipt
    const testReceiptData = {
      order: {
        id: 'TEST-PRINT',
        payment_reference: 'TEST-PRINT',
        total_amount: 0,
        created_at: new Date(),
        order_items: []
      },
      items: [{
        id: 'test',
        name: 'Test Print Item',
        quantity: 1,
        price: 0,
        category: 'Test'
      }],
      customerName: 'Test Customer',
      tableNumber: 'Test Table',
      paymentMethod: 'test',
      paymentDetails: 'Test print functionality',
      reference: 'TEST-PRINT'
    };

    // Process the test receipt (with optional printer name)
    const result = await receiptService.processOrderReceipt(testReceiptData, printerName);

    res.json({
      success: true,
      message: result.printed
        ? 'Test receipt printed successfully to thermal printer'
        : 'Test receipt generated (thermal printing not available)',
      printed: result.printed,
      printResult: result.printResult
    });
  } catch (error) {
    console.error('Test print error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to print test receipt'
    });
  }
});

// Reprint receipt endpoint
router.post('/reprint-receipt/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { printerName } = req.body;  // Optional: specify printer

    // Get the original order from database
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            items: true
          }
        },
        users: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Extract customer and table info from notes
    const extractCustomerFromNotes = (notes) => {
      if (!notes) return '';
      const customerMatch = notes.match(/Customer: ([^,]+)/);
      return customerMatch ? customerMatch[1] : '';
    };

    const extractTableFromNotes = (notes) => {
      if (!notes) return '';
      const tableMatch = notes.match(/Table: ([^,]+)/);
      return tableMatch ? tableMatch[1] : '';
    };

    // Prepare receipt data
    const receiptData = {
      order: order,
      items: order.order_items.map(item => ({
        id: item.items?.id || item.item_id,
        name: item.items?.name || 'Unknown Item',
        quantity: item.quantity,
        price: parseFloat(item.unit_price),
        category: item.items?.category || 'Unknown'
      })),
      customerName: order.users ? `${order.users.first_name} ${order.users.last_name}` : extractCustomerFromNotes(order.notes),
      tableNumber: extractTableFromNotes(order.notes),
      paymentMethod: 'reprint',
      paymentDetails: 'Reprinted receipt',
      reference: order.payment_reference || order.id
    };

    // Process the receipt reprint with optional printer name
    const result = await receiptService.processOrderReceipt(receiptData, printerName);

    res.json({
      success: true,
      message: `Receipt for order ${order.payment_reference || order.id} reprinted successfully`,
      printed: result.printed,
      printResult: result.printResult
    });
  } catch (error) {
    console.error('Reprint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reprint receipt'
    });
  }
});

// Get available printers
router.get('/printers', authenticateToken, async (req, res) => {
  try {
    const printers = receiptService.getPrinters();
    const defaultPrinter = receiptService.getDefaultPrinter();

    res.json({
      success: true,
      printers,
      defaultPrinter,
      count: printers.length
    });
  } catch (error) {
    console.error('Get printers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get printers',
      printers: []
    });
  }
});

// Print raw text to thermal printer
router.post('/print-raw', authenticateToken, async (req, res) => {
  try {
    const { text, printerName } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }

    const result = await receiptService.printToThermalPrinter(text, printerName);

    res.json({
      success: result.success,
      message: result.success ? 'Print job sent successfully' : 'Print failed',
      jobId: result.jobId,
      error: result.error
    });
  } catch (error) {
    console.error('Print raw error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send print job'
    });
  }
});

module.exports = router;