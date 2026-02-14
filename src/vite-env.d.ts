/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API types - Updated to match preload.ts
declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (receiptData: {
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
      }) => Promise<{ success: boolean; error?: string }>
      /**
       * Get available printers with enhanced Windows status detection
       * @param includeOffline - If true, returns all printers. If false/undefined, returns only online printers (default)
       * @returns Array of printer objects with online/offline status properly interpreted
       */
      getPrinters: (includeOffline?: boolean) => Promise<Array<{
        name: string
        displayName: string
        description: string
        status: string // Human-readable status: 'idle', 'printing', 'offline', 'stopped', etc.
        isOnline: boolean // True if printer is ready to use
        isDefault: boolean
        options?: any
        rawStatus?: number | string // Original Windows status code for debugging
      }>>
      setDefaultPrinter: (printerName: string) => Promise<{ success: boolean; printer?: string; error?: string }>
      getDefaultPrinter: () => Promise<string | null>
      platform: string
      versions: NodeJS.ProcessVersions
    }
  }
}

// Export empty object to make this a module while keeping global declarations
export { }