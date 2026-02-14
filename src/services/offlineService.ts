interface OfflineData {
  orders: any[];
  items: any[];
  categories: any[];
  users: any[];
}

class OfflineService {
  private dbName = 'marksjaf-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
    this.initializeSampleDataIfNeeded();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('timestamp', 'timestamp', { unique: false });
          ordersStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('items')) {
          const itemsStore = db.createObjectStore('items', { keyPath: 'id' });
          itemsStore.createIndex('name', 'name', { unique: false });
          itemsStore.createIndex('category', 'category_name', { unique: false });
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }



  // Store data locally
  async storeData(storeName: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Retrieve data from local storage
  async getData(storeName: string, key?: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = key ? store.get(key) : store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Store multiple items
  async storeMultipleData(storeName: string, dataArray: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = dataArray.length;

      if (total === 0) {
        resolve();
        return;
      }

      dataArray.forEach(data => {
        const request = store.put(data);
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }



  // Check if app is in offline mode
  isOffline(): boolean {
    // Force offline mode - always return true for complete offline functionality
    return true;
  }

  /**
   * Initialize sample data if no data exists
   */
  private async initializeSampleDataIfNeeded(): Promise<void> {
    try {
      // Check if data already exists
      const existingItems = await this.getData('items');
      if (existingItems && existingItems.length > 0) {
        console.log('Data already exists, skipping sample data initialization');
        return;
      }

      console.log('Initializing sample data for offline mode...');
      
      // Import sample data
      const { sampleCategories, sampleItems, sampleUsers, sampleOrders } = await import('./sampleData');
      
      // Store sample data
      await this.storeMultipleData('categories', sampleCategories);
      await this.storeMultipleData('items', sampleItems);
      await this.storeMultipleData('users', sampleUsers);
      await this.storeMultipleData('orders', sampleOrders);
      
      // Update metadata
      await this.storeData('metadata', {
        key: 'lastSync',
        value: new Date().toISOString()
      });
      
      console.log('Sample data initialized successfully');
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  // Clear all offline data (for reset/logout)
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const storeNames = ['orders', 'items', 'categories', 'users', 'metadata'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      
      let completed = 0;
      const total = storeNames.length;
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            console.log('All offline data cleared');
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Create singleton instance
const offlineService = new OfflineService();
export default offlineService;

// Export types for use in other files
export type { OfflineData };