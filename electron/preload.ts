import { contextBridge, ipcRenderer } from 'electron'

interface ReceiptData {
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
}

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (receiptData: ReceiptData) => ipcRenderer.invoke('print-receipt', receiptData),
  printThermal: (data: { text: string; printerName?: string }) => ipcRenderer.invoke('print-thermal', data),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  setDefaultPrinter: (printerName: string) => ipcRenderer.invoke('set-default-printer', printerName),
  getDefaultPrinter: () => ipcRenderer.invoke('get-default-printer'),

  // Add other APIs as needed
  platform: process.platform,
  versions: process.versions
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      printReceipt: (receiptData: ReceiptData) => Promise<{ success: boolean; error?: string }>
      printThermal: (data: { text: string; printerName?: string }) => Promise<{ success: boolean; error?: string; jobId?: string }>
      getPrinters: () => Promise<Array<{
        name: string
        displayName: string
        description: string
        status: string
        isDefault: boolean
        options: any
      }>>
      setDefaultPrinter: (printerName: string) => Promise<{ success: boolean; printer: string; error?: string }>
      getDefaultPrinter: () => Promise<string | null>
      platform: string
      versions: NodeJS.ProcessVersions
    }
  }
}