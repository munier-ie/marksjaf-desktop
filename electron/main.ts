import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  IpcMainInvokeEvent,
  webContents,
  net,
} from "electron";
import { join, dirname } from "path";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { existsSync, readdirSync } from "fs";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === "development";
const isPackaged = !isDev; // Simple: if not dev, then packaged

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

interface ReceiptData {
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
  orderNumber: string;
  date: string;
  orderType: string;
  paymentMethod: string;
  paymentDetails?: string;
  status: string;
  customerName?: string;
  tableNumber?: string;
  staff?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  total: number;
}

const createWindow = (): void => {
  // Determine icon path based on environment
  let iconPath: string;
  if (isDev) {
    iconPath = join(__dirname, "../public/marksjaf-logo.png");
  } else if (isPackaged) {
    iconPath = join(
      process.resourcesPath,
      "app.asar.unpacked/public/marksjaf-logo.png",
    );
  } else {
    iconPath = join(__dirname, "../public/marksjaf-logo.png");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "MARKSJAF Kitchen - POS System",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: join(__dirname, "preload.cjs"),
    },
    icon: iconPath,
    show: false, // Keep false initially to prevent flicker before maximize
    titleBarStyle: "default",
    autoHideMenuBar: true,
    fullscreen: true, // Start in fullscreen mode
  });

  // Maximize immediately if possible (though show: false keeps it hidden)
  mainWindow.maximize();

  if (mainWindow) {
    mainWindow.setMenuBarVisibility(false);
  }

  // Load the app URL
  if (isDev && mainWindow) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // Production mode - load from dist-web
    let indexPath: string;
    if (isPackaged) {
      const possiblePaths = [
        join(process.resourcesPath, "app.asar/dist-web/index.html"),
        join(process.resourcesPath, "dist-web/index.html"),
        join(__dirname, "../dist-web/index.html"),
      ];
      indexPath = possiblePaths.find((p) => existsSync(p)) || possiblePaths[0];
      console.log("🔍 Trying packaged paths:", possiblePaths);
      console.log("📍 Selected path:", indexPath);
    } else {
      indexPath = join(__dirname, "../dist-web/index.html");
    }

    if (existsSync(indexPath) && mainWindow) {
      console.log("✅ Index file exists, attempting to load...");
      mainWindow.loadFile(indexPath).catch((error) => {
        console.error("❌ Failed to load file:", error);
        const altPath = join(process.cwd(), "dist-web/index.html");
        if (existsSync(altPath) && mainWindow) {
          console.log("🔄 Trying alternative path...");
          mainWindow.loadFile(altPath);
        } else {
          console.error(
            "❌ Could not find index.html in any expected location",
          );
        }
      });
    } else {
      console.error("❌ Index file does not exist at:", indexPath);
      const altPath = join(process.cwd(), "dist-web/index.html");
      if (existsSync(altPath) && mainWindow) {
        console.log("🔄 Trying alternative path...");
        mainWindow.loadFile(altPath);
      } else {
        console.error("❌ Could not find index.html in any expected location");
        console.error("🔍 Current working directory:", process.cwd());
        console.error(
          "📁 Files in current directory:",
          readdirSync(process.cwd()),
        );
      }
    }
  }

  // Add error logging for failed loads
  if (mainWindow) {
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        console.error(
          "Failed to load:",
          errorCode,
          errorDescription,
          validatedURL,
        );
      },
    );
  }

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      console.log(
        "✅ ready-to-show event fired, maximizing and showing window...",
      );
      mainWindow.maximize(); // Ensure maximized before showing
      mainWindow.show();
    }
  });

  // Fallback: show window after 3 seconds even if ready-to-show doesn't fire
  // This ensures the window appears so users can see any error messages
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log("⏰ Timeout reached, showing window anyway...");
      mainWindow.maximize();
      mainWindow.show();
    }
  }, 3000);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (mainWindow) {
    // Only open external links (not localhost/internal navigation) in external browser
    mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      // Allow internal navigation within the app
      if (url.startsWith("http://localhost") || url.startsWith("file://")) {
        return { action: "allow" };
      }
      // Open external links in default browser
      shell.openExternal(url);
      return { action: "deny" };
    });

    // Handle navigation within the same window
    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      // Allow navigation to localhost URLs for desktop app
      if (
        navigationUrl.startsWith("http://localhost") ||
        navigationUrl.startsWith("file://")
      ) {
        return; // Allow the navigation
      }
      // Prevent navigation to external URLs and open them externally instead
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  }
};

const startBackend = (): void => {
  let backendPath: string;
  let databasePath: string;
  let uploadsDir: string;

  if (isDev) {
    backendPath = join(__dirname, "../backend/server.js");
    // In development, use the database in the backend directory
    databasePath = join(__dirname, "../backend/prisma/database/marksjaf.db");
    uploadsDir = join(__dirname, "../backend/uploads");
  } else if (isPackaged) {
    // When packaged, backend is in resources
    backendPath = join(process.resourcesPath, "backend/server.js");

    // Check for "portable" mode (data folder next to executable)
    // This allows "win unpacked" to be portable by keeping data in the same folder
    const exeDir = dirname(app.getPath("exe"));
    const portableDataDir = join(exeDir, "data");

    // Check if we effectively have write access to the executable directory or if a data folder exists
    // For simplicity, we prioritize the local data folder if it exists, OR if we are not in Program Files (likely standalone/unpacked)
    // But safely, let's look for the folder or create it if in a portable context

    let usePortable = false;

    // Check if 'data' folder exists next to exe
    if (existsSync(portableDataDir)) {
      usePortable = true;
      console.log("📂 Found local data directory, using portable mode");
    } else {
      // Logic to determine if we should create it?
      // If the User specifically asked for "win unpacked" portability,
      // usually that means everything lives in the folder.
      // Let's default to creating 'data' locally if we can write there, otherwise fallback to userData
      try {
        // Attempt to access/write to exe dir
        // This is a heuristic. If we are in Program Files, we probably can't write.
        // If we are on Desktop/Documents/USB, we can.
        if (!exeDir.toLowerCase().includes("program files")) {
          // We might be portable. Let's try to use local data dir.
          // Only assume portable if specifically requested or configured?
          // The user request is "when i open the app (build setup and win unpacked) in another pc the image stops showing... fix that please".
          // This implies they move the folder and expect data to move with it.
          // So we should prefer local data if possible.
          usePortable = true;
        }
      } catch (e) {
        console.log(
          "⚠️ Cannot check write access, defaulting to standard userData",
        );
      }
    }

    if (usePortable) {
      const dbDir = join(portableDataDir, "database");
      uploadsDir = join(portableDataDir, "uploads");
      databasePath = join(dbDir, "marksjaf.db");

      // Ensure directories exist
      const fs = require("fs");
      if (!existsSync(portableDataDir))
        fs.mkdirSync(portableDataDir, { recursive: true });
      if (!existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      if (!existsSync(uploadsDir))
        fs.mkdirSync(uploadsDir, { recursive: true });

      console.log("🚀 Running in PORTABLE mode. Data path:", portableDataDir);
    } else {
      // Standard installation (userData)
      const userDataPath = app.getPath("userData");
      const dbDir = join(userDataPath, "database");
      uploadsDir = join(userDataPath, "uploads");
      databasePath = join(dbDir, "marksjaf.db");

      const fs = require("fs");
      if (!existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      if (!existsSync(uploadsDir))
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Copy initial database if it doesn't exist in the target location
    if (!existsSync(databasePath)) {
      const initialDbPath = join(
        process.resourcesPath,
        "backend/prisma/database/marksjaf.db",
      );
      if (existsSync(initialDbPath)) {
        const fs = require("fs");
        fs.copyFileSync(initialDbPath, databasePath);
        console.log("📋 Copied initial database to:", databasePath);
      } else {
        console.log("⚠️  Initial database not found at:", initialDbPath);
      }
    }
  } else {
    // When built but not packaged (e.g. testing dist-electron directly)
    backendPath = join(__dirname, "../backend/server.js");
    databasePath = join(__dirname, "../backend/prisma/database/marksjaf.db");
    uploadsDir = join(__dirname, "../backend/uploads");
  }

  console.log("Starting backend from:", backendPath);
  console.log("Database path:", databasePath);
  console.log("Uploads path:", uploadsDir);

  // Convert database path to file URL format for Prisma
  const databaseUrl = `file:${databasePath.replace(/\\/g, "/")}`;

  // Determine backend directory for cwd - critical for Prisma to find its engine
  const backendDir = isDev
    ? join(__dirname, "../backend")
    : isPackaged
      ? join(process.resourcesPath, "backend")
      : join(__dirname, "../backend");

  // Determine Prisma engine path for packaged builds
  const prismaEnginePath = isPackaged
    ? join(
        process.resourcesPath,
        "backend/node_modules/.prisma/client/query_engine-windows.dll.node",
      )
    : undefined;

  // Log diagnostic info
  const fs = require("fs");
  const logDir = isPackaged
    ? join(app.getPath("userData"), "logs")
    : join(__dirname, "../logs");
  if (!existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, "backend.log");
  const logStream = fs.createWriteStream(logFile, { flags: "w" });

  const logMsg = [
    `[${new Date().toISOString()}] Backend startup diagnostics:`,
    `  backendPath: ${backendPath}`,
    `  backendDir (cwd): ${backendDir}`,
    `  databaseUrl: ${databaseUrl}`,
    `  uploadsDir: ${uploadsDir}`,
    `  isPackaged: ${isPackaged}`,
    `  isDev: ${isDev}`,
    `  backendPath exists: ${existsSync(backendPath)}`,
    `  backendDir exists: ${existsSync(backendDir)}`,
    `  prismaEnginePath: ${prismaEnginePath || "N/A"}`,
    `  prisma engine exists: ${prismaEnginePath ? existsSync(prismaEnginePath) : "N/A"}`,
    `  .prisma/client dir exists: ${existsSync(join(backendDir, "node_modules/.prisma/client"))}`,
    `  @prisma/client dir exists: ${existsSync(join(backendDir, "node_modules/@prisma/client"))}`,
    `  schema.prisma exists: ${existsSync(join(backendDir, "node_modules/.prisma/client/schema.prisma"))}`,
    `  process.resourcesPath: ${process.resourcesPath || "N/A"}`,
    "",
  ].join("\n");

  logStream.write(logMsg);
  console.log(logMsg);
  console.log("📝 Backend log file:", logFile);

  backendProcess = spawn("node", [backendPath], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true, // Hide console window on Windows
    cwd: backendDir, // Set cwd so Prisma can resolve its engine via process.cwd()
    env: {
      ...process.env,
      NODE_ENV: isDev ? "development" : "production",
      DATABASE_URL: databaseUrl,
      UPLOADS_DIR: uploadsDir,
      IS_PACKAGED: isPackaged ? "true" : "false",
      ...(prismaEnginePath
        ? { PRISMA_QUERY_ENGINE_LIBRARY: prismaEnginePath }
        : {}),
    },
  });

  // Pipe backend stdout/stderr to log file for diagnostics
  if (backendProcess.stdout) {
    backendProcess.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      logStream.write(text);
      console.log("[backend]", text.trim());
    });
  }
  if (backendProcess.stderr) {
    backendProcess.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      logStream.write(`[STDERR] ${text}`);
      console.error("[backend-err]", text.trim());
    });
  }

  backendProcess.on("error", (error) => {
    const errMsg = `Backend process error: ${error.message}\n${error.stack}\n`;
    logStream.write(errMsg);
    console.error(errMsg);
  });

  backendProcess.on("exit", (code) => {
    const exitMsg = `Backend process exited with code ${code}\n`;
    logStream.write(exitMsg);
    console.log(exitMsg);
  });
};

const stopBackend = (): void => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
};

/**
 * Poll http://localhost:5000 until the backend is ready, then resolve.
 * This prevents the race condition where the Electron window loads before
 * the Express backend is listening — which causes "network error" toasts.
 */
const waitForBackend = (port = 5000, timeoutMs = 30000): Promise<void> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = net.request(`http://localhost:${port}`);
      req.on('response', () => {
        clearInterval(interval);
        console.log(`✅ Backend is ready on port ${port}`);
        resolve();
      });
      req.on('error', () => {
        // Not ready yet — keep waiting unless we've timed out
        if (Date.now() - start >= timeoutMs) {
          clearInterval(interval);
          console.warn(`⚠️ Backend did not start within ${timeoutMs}ms — opening window anyway`);
          resolve();
        }
      });
      req.end();
    }, 500);
  });
};

// App event handlers
console.log("🚀 Electron app starting...");

app.whenReady().then(async () => {
  console.log("📱 App ready, starting backend...");
  startBackend();

  // Wait until the backend Express server is actually listening before
  // opening the window — this eliminates the "network error" race condition
  // that occurred in packaged builds where Prisma takes several seconds to load.
  console.log("⏳ Waiting for backend to be ready...");
  await waitForBackend(5000, 30000);

  console.log("🖥️ Creating window...");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});

// Store for custom default printer (persists in memory)
let customDefaultPrinter: string | null = null;

// IPC handler to set custom default printer
ipcMain.handle(
  "set-default-printer",
  async (event: IpcMainInvokeEvent, printerName: string) => {
    try {
      customDefaultPrinter = printerName;
      return { success: true, printer: printerName };
    } catch (error) {
      console.error("Error setting default printer:", error);
      return { success: false, error: String(error) };
    }
  },
);

// IPC handler to get custom default printer
ipcMain.handle("get-default-printer", async (event: IpcMainInvokeEvent) => {
  return customDefaultPrinter;
});

// IPC handler for getting system printers
// Returns all configured printers - Windows handles actual availability during print
ipcMain.handle("get-printers", async () => {
  try {
    const allPrinters =
      (await webContents.getAllWebContents()[0]?.getPrintersAsync()) || [];

    const printers = allPrinters.map((printer) => {
      return {
        name: printer.name,
        displayName: printer.displayName,
        description: printer.description,
        status: "ready",
        isOnline: true,
        isDefault: (printer as any).isDefault,
        options: printer.options,
      };
    });

    return printers;
  } catch (error) {
    console.error("❌ Error getting printers:", error);
    return [];
  }
});

// IPC handler for printing receipts (HTML-based, shows print dialog)
// This is the legacy method - works but not optimal for thermal printers
ipcMain.handle(
  "print-receipt",
  async (event: IpcMainInvokeEvent, receiptData: ReceiptData) => {
    try {
      // Get the custom default printer if set
      const printerName = customDefaultPrinter;

      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        width: 225, // Approx 59mm width (58mm + buffer)
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Generate HTML for receipt
      const receiptHTML = generateReceiptHTML(receiptData);

      // Save HTML for debugging purposes (in user data folder)
      try {
        const fs = require("fs");
        const debugPath = join(
          app.getPath("userData"),
          "last_receipt_debug.html",
        );
        fs.writeFileSync(debugPath, receiptHTML);
        console.log("📝 Saved debug receipt HTML to:", debugPath);
      } catch (e) {
        console.error("⚠️ Failed to save debug receipt HTML:", e);
      }

      await printWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(receiptHTML)}`,
      );

      // Print options for thermal printer
      const printOptions: any = {
        silent: false, // Show print dialog so user can verify settings
        printBackground: true,
        margins: {
          marginType: "custom" as const,
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
        pageSize: {
          width: 58000, // 58mm in micrometers
          height: 200000, // Auto height
        },
      };

      // If we have a custom default printer, specify it
      if (printerName) {
        printOptions.deviceName = printerName;
      }

      await printWindow.webContents.print(
        printOptions,
        (success, failureReason) => {
          printWindow.close();

          if (success) {
          } else {
            console.error("❌ Print failed:", failureReason);
          }
        },
      );

      return { success: true };
    } catch (error) {
      console.error("❌ Print error:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// IPC handler for RAW thermal printing via backend API
// This is the preferred method for thermal printers - sends raw text directly
ipcMain.handle(
  "print-thermal",
  async (
    event: IpcMainInvokeEvent,
    data: { text: string; printerName?: string },
  ) => {
    try {
      const targetPrinter = data.printerName || customDefaultPrinter;
      if (targetPrinter) {
      }

      // Call the backend API to print
      const response = await fetch(
        "http://localhost:5000/api/printers/print-raw",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Note: In production, you'd need to handle auth token here
          },
          body: JSON.stringify({
            text: data.text,
            printerName: targetPrinter,
          }),
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        jobId?: string;
      };

      if (result.success) {
      } else {
        console.error("❌ RAW thermal print failed:", result.error);
      }

      return result;
    } catch (error) {
      console.error("❌ RAW thermal print error:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

function generateReceiptHTML(receiptData: ReceiptData): string {
  const formattedDate = new Date(receiptData.date).toLocaleString("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Fix address newlines - replace with comma and space
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
      ${
        receiptData.customerName
          ? `
      <div class="field">
        <span class="field-label">Customer:</span>
        <span>${receiptData.customerName}</span>
      </div>`
          : ""
      }
      ${
        receiptData.tableNumber
          ? `
      <div class="field">
        <span class="field-label">Table:</span>
        <span>${receiptData.tableNumber}</span>
      </div>`
          : ""
      }
      <div class="field">
        <span class="field-label">Type:</span>
        <span>${receiptData.orderType.toUpperCase()}</span>
      </div>
      
      <div class="line"></div>
      
      <!-- Items List -->
      <div style="width: 100%;">
        ${receiptData.items
          .map(
            (item) => `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="item-data">
              <span>${item.quantity} x ${item.price.toFixed(0)}</span>
              <span class="bold">${item.total.toFixed(0)}</span>
            </div>
          </div>
        `,
          )
          .join("")}
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
        <span>${receiptData.paymentMethod?.toUpperCase()}</span>
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
