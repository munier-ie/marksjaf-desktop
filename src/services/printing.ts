/// <reference path="../vite-env.d.ts" />

export interface ReceiptData {
  businessName?: string
  address?: string
  phone?: string
  orderNumber: string
  date: string
  orderType: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  total: number
  printerName?: string
  thermal?: boolean
}

export class PrintingService {
  static async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    try {
      // Updated to use optional chaining and proper typing
      if (window.electronAPI?.printReceipt) {
        const result = await window.electronAPI.printReceipt(receiptData)
        return result.success
      } else {
        // Fallback for web version - open print dialog
        this.printReceiptWeb(receiptData)
        return true
      }
    } catch (error) {
      console.error('Printing failed:', error)
      return false
    }
  }

  // Add method for direct thermal printer printing
  static async printToThermalPrinter(receiptData: ReceiptData, printerName?: string): Promise<boolean> {
    try {
      if (window.electronAPI?.printReceipt) {
        const result = await window.electronAPI.printReceipt({
          ...receiptData,
          printerName, // Pass specific printer name
          thermal: true // Flag for thermal printing
        })
        return result.success
      }
      return false
    } catch (error) {
      console.error('Thermal printing failed:', error)
      return false
    }
  }

  private static printReceiptWeb(receiptData: ReceiptData): void {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = this.generateReceiptHTML(receiptData)
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
    printWindow.close()
  }

  private static generateReceiptHTML(receiptData: ReceiptData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            margin: 0; 
            padding: 20px;
            max-width: 300px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="center bold">${receiptData.businessName || 'MarkSJAF Restaurant'}</div>
        <div class="center">${receiptData.address || ''}</div>
        <div class="center">${receiptData.phone || ''}</div>
        <div class="line"></div>
        <div>Order #: ${receiptData.orderNumber}</div>
        <div>Date: ${new Date(receiptData.date).toLocaleString()}</div>
        <div>Type: ${receiptData.orderType}</div>
        <div class="line"></div>
        ${receiptData.items.map(item => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span>₦${item.total.toFixed(2)}</span>
          </div>
        `).join('')}
        <div class="line"></div>
        <div class="item bold">
          <span>TOTAL:</span>
          <span>₦${receiptData.total.toFixed(2)}</span>
        </div>
        <div class="center">Thank you for your visit!</div>
      </body>
      </html>
    `
  }
}