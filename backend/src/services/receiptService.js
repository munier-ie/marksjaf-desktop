const fs = require('fs');
const path = require('path');

// Try to load the printer package for direct thermal printing
let printer = null;
try {
  printer = require('printer');
  console.log('✅ Printer module loaded successfully');
} catch (error) {
  console.warn('⚠️ Printer module not available:', error.message);
  console.warn('   Install with: npm install printer');
}

class ReceiptService {
  constructor() {
    // Real business information is used directly in receipt generation
  }

  /**
   * Get list of available printers
   * @returns {Array} List of printer objects
   */
  getPrinters() {
    if (!printer) {
      console.error('Printer module not loaded');
      return [];
    }
    try {
      const printers = printer.getPrinters();
      console.log(`📋 Found ${printers.length} printer(s)`);
      return printers.map(p => ({
        name: p.name,
        isDefault: p.isDefault || false,
        status: p.status || 'unknown',
        statusNumber: p.statusNumber || 0
      }));
    } catch (error) {
      console.error('Error getting printers:', error);
      return [];
    }
  }

  /**
   * Get the default printer name
   * @returns {string|null} Default printer name or null
   */
  getDefaultPrinter() {
    if (!printer) {
      return null;
    }
    try {
      return printer.getDefaultPrinterName();
    } catch (error) {
      console.error('Error getting default printer:', error);
      return null;
    }
  }

  /**
   * Print raw text directly to a thermal printer
   * @param {string} receiptText - The receipt text to print
   * @param {string} printerName - Name of the printer (optional, uses default if not specified)
   * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
   */
  async printToThermalPrinter(receiptText, printerName = null) {
    return new Promise((resolve) => {
      if (!printer) {
        resolve({ success: false, error: 'Printer module not available' });
        return;
      }

      const targetPrinter = printerName || this.getDefaultPrinter();
      if (!targetPrinter) {
        resolve({ success: false, error: 'No printer specified and no default printer found' });
        return;
      }

      console.log(`🖨️ Sending print job to: ${targetPrinter}`);

      // Add paper cut command at the end (ESC i - partial cut for most thermal printers)
      const printData = receiptText + '\n\n\n\n\n\x1B\x69';  // 5 line feeds + ESC i (partial cut)

      try {
        printer.printDirect({
          data: printData,
          printer: targetPrinter,
          type: 'RAW',
          success: (jobId) => {
            console.log(`✅ Print job sent successfully. Job ID: ${jobId}`);
            resolve({ success: true, jobId: String(jobId) });
          },
          error: (err) => {
            console.error('❌ Print error:', err);
            resolve({ success: false, error: String(err) });
          }
        });
      } catch (error) {
        console.error('❌ Exception during print:', error);
        resolve({ success: false, error: String(error) });
      }
    });
  }

  /**
   * Generate a formatted receipt string
   * @param {Object} orderData - Order data including items, customer info, etc.
   * @returns {string} Formatted receipt text
   */
  generateReceipt(orderData) {
    const { order, items, customerName, tableNumber, paymentMethod, paymentDetails, reference } = orderData;

    // ESC/POS Commands
    const ESC = '\x1B';
    const GS = '\x1D';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const DOUBLE_STRIKE_ON = ESC + 'G' + '\x01';
    const DOUBLE_STRIKE_OFF = ESC + 'G' + '\x00';
    const INIT = ESC + '@';

    let receipt = INIT;

    // Turn on bold and double strike for maximum darkness/thickness
    receipt += BOLD_ON + DOUBLE_STRIKE_ON;

    const width = 48; // Standard receipt width

    // Header
    receipt += this.centerText('MARKSJAF KITCHEN', width) + '\n';
    receipt += this.centerText('Premium Nigerian Cuisine', width) + '\n';
    receipt += this.centerText('Shop 1 Modibbo Plaza, Yahaya Guasau', width) + '\n';
    receipt += this.centerText('Sharada, Kano, Nigeria', width) + '\n';
    receipt += '='.repeat(width) + '\n';

    // Order Info
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Order ID: ${reference || order?.id || 'N/A'}\n`;

    if (customerName) {
      receipt += `Customer: ${customerName}\n`;
    }

    if (tableNumber) {
      receipt += `Table: ${tableNumber}\n`;
    }

    receipt += '-'.repeat(width) + '\n';

    // Items
    receipt += this.padText('ITEM(s)', 'QTY', 'PRICE', 'TOTAL', width) + '\n';
    receipt += '-'.repeat(width) + '\n';

    let subtotal = 0;

    items.forEach(item => {
      const itemName = item.name || item.items?.name || 'Unknown Item';
      const quantity = item.quantity || 1;
      const price = item.unit_price || item.price || 0;
      const total = quantity * price;
      subtotal += total;

      // Item name (may wrap to multiple lines)
      const itemLines = this.wrapText(itemName, 25); // Fixed width for item name
      receipt += itemLines[0].padEnd(25); // Item name column
      receipt += `${quantity}`.padStart(4); // Quantity column with space
      receipt += ` ₦${price.toFixed(2)}`.padStart(9); // Price column with space
      receipt += ` ₦${total.toFixed(2)}`.padStart(10) + '\n'; // Total column with space

      // Additional lines for long item names
      for (let i = 1; i < itemLines.length; i++) {
        receipt += itemLines[i] + '\n';
      }
    });

    receipt += '-'.repeat(width) + '\n';

    // Totals
    receipt += '='.repeat(width) + '\n';
    receipt += `TOTAL:`.padEnd(width - 12) + `₦${subtotal.toFixed(2)}`.padStart(12) + '\n';
    receipt += '='.repeat(width) + '\n';

    // Payment Info
    receipt += `Payment Method: ${paymentMethod || 'Cash'}\n`;
    if (paymentDetails) {
      receipt += `Payment Details: ${paymentDetails}\n`;
    }
    receipt += `Status: PAID\n`;

    receipt += '-'.repeat(width) + '\n';

    // Footer
    receipt += this.centerText('Thank you for choosing Marksjaf!', width) + '\n';
    receipt += this.centerText('Visit us again soon!', width) + '\n';
    receipt += '\n';
    receipt += this.centerText('For support: +234 8032549466', width) + '\n';
    receipt += this.centerText('Email: hello@marksjafkitchen.com.ng', width) + '\n';
    receipt += '='.repeat(width) + '\n';

    // Reset formatting at the end
    receipt += BOLD_OFF + DOUBLE_STRIKE_OFF;

    return receipt;
  }

  /**
   * Print receipt to console/terminal
   * @param {string} receiptText - Formatted receipt text
   */
  printToConsole(receiptText) {
    console.log('\n' + '█'.repeat(50));
    console.log('█' + ' '.repeat(48) + '█');
    console.log('█' + this.centerText('RECEIPT PRINTED', 48) + '█');
    console.log('█' + ' '.repeat(48) + '█');
    console.log('█'.repeat(50));
    console.log(receiptText);
    console.log('█'.repeat(50));
  }

  /**
   * Save receipt to file
   * @param {string} receiptText - Formatted receipt text
   * @param {string} filename - File name for the receipt
   */
  async saveReceiptToFile(receiptText, filename) {
    try {
      // Use UPLOADS_DIR environment variable if set (from main.ts), otherwise fallback to a writable location
      // In production (packaged), we must use app.getPath('userData') which is passed via UPLOADS_DIR
      let receiptsDir;

      if (process.env.UPLOADS_DIR) {
        // Use a 'receipts' folder next to 'uploads' or inside the user data folder
        receiptsDir = path.join(path.dirname(process.env.UPLOADS_DIR), 'receipts');
      } else {
        // Fallback for development if UPLOADS_DIR is not set
        receiptsDir = path.join(__dirname, '../../receipts');
      }

      // Create receipts directory if it doesn't exist
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filePath = path.join(receiptsDir, `${filename}.txt`);
      fs.writeFileSync(filePath, receiptText, 'utf8');

      console.log(`Receipt saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Error saving receipt:', error);
      // Don't crash the whole print process if file saving fails
      return null;
    }
  }

  /**
   * Center text within given width
   * @param {string} text - Text to center
   * @param {number} width - Total width
   * @returns {string} Centered text
   */
  centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  /**
   * Pad text for columns
   * @param {string} col1 - First column
   * @param {string} col2 - Second column
   * @param {string} col3 - Third column
   * @param {string} col4 - Fourth column
   * @param {number} width - Total width
   * @returns {string} Padded text
   */
  padText(col1, col2, col3, col4, width) {
    const col1Width = width - 20;
    const col2Width = 3;
    const col3Width = 8;
    const col4Width = 9;

    return col1.padEnd(col1Width) +
      col2.padStart(col2Width) +
      col3.padStart(col3Width) +
      col4.padStart(col4Width);
  }

  /**
   * Wrap text to fit within specified width
   * @param {string} text - Text to wrap
   * @param {number} width - Maximum width per line
   * @returns {Array<string>} Array of wrapped lines
   */
  wrapText(text, width) {
    if (text.length <= width) {
      return [text];
    }

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Process and print receipt for an order
   * @param {Object} orderData - Complete order data
   * @param {string} printerName - Optional printer name (uses default if not specified)
   * @returns {Promise<{receiptText: string, printed: boolean, printResult?: object}>}
   */
  async processOrderReceipt(orderData, printerName = null) {
    try {
      const receiptText = this.generateReceipt(orderData);

      // Print to console (for debugging/logging)
      this.printToConsole(receiptText);

      // Save to file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `receipt_${orderData.reference || timestamp}`;
      await this.saveReceiptToFile(receiptText, filename);

      // Print to thermal printer
      let printResult = { success: false, error: 'Thermal printing skipped' };
      if (printer) {
        console.log('🖨️ Attempting to print to thermal printer...');
        printResult = await this.printToThermalPrinter(receiptText, printerName);
      } else {
        console.log('⚠️ Thermal printing not available - printer module not loaded');
      }

      return {
        receiptText,
        printed: printResult.success,
        printResult
      };
    } catch (error) {
      console.error('Error processing receipt:', error);
      throw error;
    }
  }
}

module.exports = new ReceiptService();