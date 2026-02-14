import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),
    printThermal: (data) => ipcRenderer.invoke('print-thermal', data),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    setDefaultPrinter: (printerName) => ipcRenderer.invoke('set-default-printer', printerName),
    getDefaultPrinter: () => ipcRenderer.invoke('get-default-printer'),
    // Add other APIs as needed
    platform: process.platform,
    versions: process.versions
});
