"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: (receiptData) => electron.ipcRenderer.invoke("print-receipt", receiptData),
  printThermal: (data) => electron.ipcRenderer.invoke("print-thermal", data),
  getPrinters: () => electron.ipcRenderer.invoke("get-printers"),
  setDefaultPrinter: (printerName) => electron.ipcRenderer.invoke("set-default-printer", printerName),
  getDefaultPrinter: () => electron.ipcRenderer.invoke("get-default-printer"),
  // Add other APIs as needed
  platform: process.platform,
  versions: process.versions
});
//# sourceMappingURL=preload.cjs.map
