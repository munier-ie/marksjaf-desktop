"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const url = require("url");
const fs = require("fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.cjs", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
const isDev = process.env.NODE_ENV === "development";
const isPackaged = !isDev;
let mainWindow = null;
let backendProcess = null;
const createWindow = () => {
  let iconPath;
  if (isDev) {
    iconPath = path.join(__dirname$1, "../public/marksjaf-logo.png");
  } else if (isPackaged) {
    iconPath = path.join(process.resourcesPath, "app.asar.unpacked/public/marksjaf-logo.png");
  } else {
    iconPath = path.join(__dirname$1, "../public/marksjaf-logo.png");
  }
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "MARKSJAF Kitchen - POS System",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname$1, "preload.cjs")
    },
    icon: iconPath,
    show: false,
    titleBarStyle: "default",
    autoHideMenuBar: true
  });
  if (mainWindow) {
    mainWindow.setMenuBarVisibility(false);
  }
  if (isDev && mainWindow) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    let indexPath;
    if (isPackaged) {
      const possiblePaths = [
        path.join(process.resourcesPath, "app.asar/dist-web/index.html"),
        path.join(process.resourcesPath, "dist-web/index.html"),
        path.join(__dirname$1, "../dist-web/index.html")
      ];
      indexPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
      console.log("🔍 Trying packaged paths:", possiblePaths);
      console.log("📍 Selected path:", indexPath);
    } else {
      indexPath = path.join(__dirname$1, "../dist-web/index.html");
    }
    if (fs.existsSync(indexPath)) {
      console.log("✅ Index file exists, attempting to load...");
      mainWindow.loadFile(indexPath).catch((error) => {
        console.error("❌ Failed to load file:", error);
        const altPath = path.join(process.cwd(), "dist-web/index.html");
        if (fs.existsSync(altPath) && mainWindow) {
          console.log("🔄 Trying alternative path...");
          mainWindow.loadFile(altPath);
        } else {
          console.error("❌ Could not find index.html in any expected location");
        }
      });
    } else {
      console.error("❌ Index file does not exist at:", indexPath);
      const altPath = path.join(process.cwd(), "dist-web/index.html");
      if (fs.existsSync(altPath)) {
        console.log("🔄 Trying alternative path...");
        if (mainWindow) {
          mainWindow.loadFile(altPath);
        }
      } else {
        console.error("❌ Could not find index.html in any expected location");
        console.error("🔍 Current working directory:", process.cwd());
        console.error("📁 Files in current directory:", fs.readdirSync(process.cwd()));
      }
    }
  }
  if (mainWindow) {
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      console.error("Failed to load:", errorCode, errorDescription, validatedURL);
    });
  }
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      console.log("✅ ready-to-show event fired, showing window...");
      mainWindow.show();
    }
  });
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log("⏰ Timeout reached, showing window anyway...");
      mainWindow.show();
    }
  }, 3e3);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (mainWindow) {
    mainWindow.webContents.setWindowOpenHandler(({ url: url2 }) => {
      if (url2.startsWith("http://localhost") || url2.startsWith("file://")) {
        return { action: "allow" };
      }
      electron.shell.openExternal(url2);
      return { action: "deny" };
    });
    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      if (navigationUrl.startsWith("http://localhost") || navigationUrl.startsWith("file://")) {
        return;
      }
      event.preventDefault();
      electron.shell.openExternal(navigationUrl);
    });
  }
};
const startBackend = () => {
  let backendPath;
  let databasePath;
  if (isDev) {
    backendPath = path.join(__dirname$1, "../backend/server.js");
    databasePath = path.join(__dirname$1, "../backend/prisma/database/marksjaf.db");
  } else if (isPackaged) {
    backendPath = path.join(process.resourcesPath, "backend/server.js");
    const userDataPath = electron.app.getPath("userData");
    databasePath = path.join(userDataPath, "database", "marksjaf.db");
    const dbDir = path.join(userDataPath, "database");
    if (!fs.existsSync(dbDir)) {
      const fs2 = require("fs");
      fs2.mkdirSync(dbDir, { recursive: true });
      console.log("📁 Created database directory:", dbDir);
    }
    if (!fs.existsSync(databasePath)) {
      const initialDbPath = path.join(process.resourcesPath, "backend/prisma/database/marksjaf.db");
      if (fs.existsSync(initialDbPath)) {
        const fs2 = require("fs");
        fs2.copyFileSync(initialDbPath, databasePath);
        console.log("📋 Copied initial database to:", databasePath);
      } else {
        console.log("⚠️  Initial database not found at:", initialDbPath);
      }
    }
  } else {
    backendPath = path.join(__dirname$1, "../backend/server.js");
    databasePath = path.join(__dirname$1, "../backend/prisma/database/marksjaf.db");
  }
  console.log("Starting backend from:", backendPath);
  console.log("Database path:", databasePath);
  const databaseUrl = `file:${databasePath.replace(/\\/g, "/")}`;
  let uploadsDir;
  if (isPackaged) {
    const userDataPath = electron.app.getPath("userData");
    uploadsDir = path.join(userDataPath, "uploads");
  } else {
    uploadsDir = path.join(__dirname$1, "../backend/uploads");
  }
  backendProcess = child_process.spawn("node", [backendPath], {
    stdio: "inherit",
    windowsHide: true,
    // Hide console window on Windows
    env: {
      ...process.env,
      NODE_ENV: isDev ? "development" : "production",
      DATABASE_URL: databaseUrl,
      UPLOADS_DIR: uploadsDir,
      IS_PACKAGED: isPackaged ? "true" : "false"
    }
  });
  backendProcess.on("error", (error) => {
    console.error("Backend process error:", error);
  });
  backendProcess.on("exit", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
};
const stopBackend = () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
};
console.log("🚀 Electron app starting...");
electron.app.whenReady().then(() => {
  console.log("📱 App ready, starting backend and creating window...");
  startBackend();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  stopBackend();
});
let customDefaultPrinter = null;
electron.ipcMain.handle("set-default-printer", async (event, printerName) => {
  try {
    customDefaultPrinter = printerName;
    return { success: true, printer: printerName };
  } catch (error) {
    console.error("Error setting default printer:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("get-default-printer", async (event) => {
  return customDefaultPrinter;
});
electron.ipcMain.handle("get-printers", async () => {
  var _a;
  try {
    const allPrinters = await ((_a = electron.webContents.getAllWebContents()[0]) == null ? void 0 : _a.getPrintersAsync()) || [];
    const printers = allPrinters.map((printer) => {
      return {
        name: printer.name,
        displayName: printer.displayName,
        description: printer.description,
        status: "ready",
        isOnline: true,
        isDefault: printer.isDefault,
        options: printer.options
      };
    });
    return printers;
  } catch (error) {
    console.error("❌ Error getting printers:", error);
    return [];
  }
});
electron.ipcMain.handle("print-receipt", async (event, receiptData) => {
  try {
    const printerName = customDefaultPrinter;
    const printWindow = new electron.BrowserWindow({
      width: 225,
      // Approx 59mm width (58mm + buffer)
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    const receiptHTML = generateReceiptHTML(receiptData);
    try {
      const fs2 = require("fs");
      const debugPath = path.join(electron.app.getPath("userData"), "last_receipt_debug.html");
      fs2.writeFileSync(debugPath, receiptHTML);
      console.log("📝 Saved debug receipt HTML to:", debugPath);
    } catch (e) {
      console.error("⚠️ Failed to save debug receipt HTML:", e);
    }
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHTML)}`);
    const printOptions = {
      silent: false,
      // Show print dialog so user can verify settings
      printBackground: true,
      margins: {
        marginType: "custom",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      pageSize: {
        width: 58e3,
        // 58mm in micrometers
        height: 2e5
        // Auto height
      }
    };
    if (printerName) {
      printOptions.deviceName = printerName;
    }
    await printWindow.webContents.print(printOptions, (success, failureReason) => {
      printWindow.close();
      if (success) {
      } else {
        console.error("❌ Print failed:", failureReason);
      }
    });
    return { success: true };
  } catch (error) {
    console.error("❌ Print error:", error);
    return { success: false, error: error.message };
  }
});
electron.ipcMain.handle("print-thermal", async (event, data) => {
  try {
    const targetPrinter = data.printerName || customDefaultPrinter;
    if (targetPrinter) {
    }
    const response = await fetch("http://localhost:5000/api/printers/print-raw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
        // Note: In production, you'd need to handle auth token here
      },
      body: JSON.stringify({
        text: data.text,
        printerName: targetPrinter
      })
    });
    const result = await response.json();
    if (result.success) {
    } else {
      console.error("❌ RAW thermal print failed:", result.error);
    }
    return result;
  } catch (error) {
    console.error("❌ RAW thermal print error:", error);
    return { success: false, error: error.message };
  }
});
function generateReceiptHTML(receiptData) {
  var _a;
  const formattedDate = new Date(receiptData.date).toLocaleString("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  const formattedAddress = (receiptData.address || "").replace(/\n/g, ", ");
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: 58mm auto;
          margin: 0;
        }
        body { 
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          font-weight: 900;
          margin: 0; 
          padding: 10px 0;
          width: 58mm; 
          max-width: 58mm;
          color: #000000;
          background-color: #ffffff;
        }
        * {
          box-sizing: border-box;
          color: #000000 !important;
          font-weight: 900 !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .right { text-align: right; }
        .left { text-align: left; }
        
        .line { border-bottom: 2px dashed #000; margin: 3px 0; width: 100%; }
        .double-line { border-bottom: 3px double #000; margin: 3px 0; width: 100%; }
        
        /* Spacing Helpers */
        .spacer { height: 10px; width: 100%; }
        .divider { border-bottom: 2px dashed #000; margin: 5px 0; width: 100%; }

        .header { margin-bottom: 15px; } 
        .footer { margin-top: 15px; font-size: 10px; }
        
        /* Inline Field Style - Left Aligned */
        .field {
          margin-bottom: 2px;
          display: flex;
          justify-content: flex-start; /* Left align */
          gap: 5px; /* Small gap */
        }
        .field-label {
          /* No fixed width, just natural flow */
        }
        
        .item-row { margin-bottom: 2px; border-bottom: 1px dotted #000; padding-bottom: 2px; }
        .item-name { display: block; width: 100%; white-space: normal; }
        
        /* Item Data - Left Aligned */
        .item-data { 
          display: flex; 
          justify-content: flex-start; 
          font-size: 11px; 
          gap: 15px; /* Fixed small gap between Qty/Price and Total */
        }

        .total-section { font-size: 13px; font-weight: 900; margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header center">
        <div class="bold" style="font-size: 14px;">${receiptData.businessName || "MARKSJAF KITCHEN"}</div>
        <div style="height: 10px;"></div>
        <div style="font-size: 10px;">${formattedAddress}</div>
        <div class="spacer"></div>
      </div>
      
      <div class="divider"></div>
      
      <!-- Inline Fields -->
      <div class="field">
        <span class="field-label">Date:</span>
        <span>${formattedDate}</span>
      </div>
      <div class="field">
        <span class="field-label">Order:</span>
        <span class="bold">#${receiptData.orderNumber}</span>
      </div>
      ${receiptData.customerName ? `
      <div class="field">
        <span class="field-label">Customer:</span>
        <span>${receiptData.customerName}</span>
      </div>` : ""}
      ${receiptData.tableNumber ? `
      <div class="field">
        <span class="field-label">Table:</span>
        <span>${receiptData.tableNumber}</span>
      </div>` : ""}
      <div class="field">
        <span class="field-label">Type:</span>
        <span>${receiptData.orderType.toUpperCase()}</span>
      </div>
      
      <div class="line"></div>
      
      <!-- Items List -->
      <div style="width: 100%;">
        ${receiptData.items.map((item) => `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="item-data">
              <span>${item.quantity} x ${item.price.toFixed(0)}</span>
              <span class="bold">${item.total.toFixed(0)}</span>
            </div>
          </div>
        `).join("")}
      </div>
      
      <div class="line"></div>
      
      <div class="total-section">
        <div style="display: flex; justify-content: flex-start; gap: 10px;">
          <span>TOTAL:</span>
          <span>₦${receiptData.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="double-line"></div>
      
      <div class="field">
        <span class="field-label">Pay:</span>
        <span>${(_a = receiptData.paymentMethod) == null ? void 0 : _a.toUpperCase()}</span>
      </div>
      
      <div class="divider"></div>
      <div class="spacer"></div>
      
      <div class="footer center">
        <div class="bold">Thank you!</div>
        ${receiptData.customerName ? `<div>${receiptData.customerName}</div>` : ""}
        <div>Tel: ${receiptData.phone || "+234 8032549466"}</div>
      </div>
      <br />
    </body>
    </html>
  `;
}
//# sourceMappingURL=main.cjs.map
