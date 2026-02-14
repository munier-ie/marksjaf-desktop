import offlineService from './offlineService';
import { toast } from 'sonner';

// Offline-only API wrapper
class OfflineAPI {
  // Create order (offline only)
  async createOrder(orderData: any): Promise<any> {
    try {
      // Store order locally
      const offlineOrder = {
        ...orderData,
        id: `MA-JAF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'completed',
        created_at: new Date().toISOString(),
        offline: true
      };

      await offlineService.storeData('orders', offlineOrder);
      
      // Update inventory locally
      if (orderData.items) {
        for (const item of orderData.items) {
          await this.updateInventoryLocally(item.item_id, -item.quantity);
        }
      }

      toast.success('Order saved successfully.');
      return { success: true, data: offlineOrder, offline: true };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Get orders (offline only)
  async getOrders(): Promise<any> {
    try {
      // Get orders from local storage
      const localOrders = await offlineService.getData('orders');
      return {
        success: true,
        data: Array.isArray(localOrders) ? localOrders : [],
        offline: true
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        success: false,
        data: [],
        error: 'Failed to fetch orders from local storage'
      };
    }
  }

  // Get items (offline only)
  async getItems(): Promise<any> {
    try {
      // Get items from local storage
      const localItems = await offlineService.getData('items');
      return {
        success: true,
        data: Array.isArray(localItems) ? localItems : [],
        offline: true
      };
    } catch (error) {
      console.error('Error fetching items:', error);
      return {
        success: false,
        data: [],
        error: 'Failed to fetch items from local storage'
      };
    }
  }

  // Create item (offline only)
  async createItem(itemData: any): Promise<any> {
    try {
      // Store item locally
      const offlineItem = {
        ...itemData,
        id: `MA-JAF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        offline: true
      };

      await offlineService.storeData('items', offlineItem);
      
      toast.success('Item saved successfully.');
      return { success: true, data: offlineItem, offline: true };
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  // Update item (offline only)
  async updateItem(itemId: string, itemData: any): Promise<any> {
    try {
      // Update item locally
      const existingItem = await offlineService.getData('items', itemId);
      if (existingItem) {
        const updatedItem = {
          ...existingItem,
          ...itemData,
          updated_at: new Date().toISOString(),
          offline_updated: true
        };

        await offlineService.storeData('items', updatedItem);
        toast.success('Item updated successfully.');
        return { success: true, offline: true };
      } else {
        throw new Error('Item not found');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Delete item (offline only)
  async deleteItem(itemId: string): Promise<any> {
    try {
      // Mark item as deleted locally (soft delete)
      const existingItem = await offlineService.getData('items', itemId);
      if (existingItem) {
        const deletedItem = {
          ...existingItem,
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          offline_deleted: true
        };

        await offlineService.storeData('items', deletedItem);
        toast.success('Item deleted successfully.');
        return { success: true, offline: true };
      } else {
        throw new Error('Item not found');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Update inventory locally
  private async updateInventoryLocally(itemId: string, quantityChange: number): Promise<void> {
    try {
      const item = await offlineService.getData('items', itemId);
      if (item) {
        const newQuantity = Math.max(0, item.stock_quantity + quantityChange);
        const updatedItem = {
          ...item,
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        };
        
        await offlineService.storeData('items', updatedItem);
      }
    } catch (error) {
      console.error('Error updating inventory locally:', error);
    }
  }

  // Get categories (offline only)
  async getCategories(): Promise<any> {
    try {
      const localCategories = await offlineService.getData('categories');
      return {
        success: true,
        data: Array.isArray(localCategories) ? localCategories : [],
        offline: true
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        data: [],
        error: 'Failed to fetch categories from local storage'
      };
    }
  }

  // Get users (offline only)
  async getUsers(): Promise<any> {
    try {
      const localUsers = await offlineService.getData('users');
      return {
        success: true,
        data: Array.isArray(localUsers) ? localUsers : [],
        offline: true
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        data: [],
        error: 'Failed to fetch users from local storage'
      };
    }
  }

  // Clear offline data
  async clearOfflineData(): Promise<void> {
    await offlineService.clearOfflineData();
    toast.success('Offline data cleared');
  }

  // Dashboard methods (offline only)
  async getDashboardStats(): Promise<any> {
    try {
      // Calculate stats from local data
      const [orders, items] = await Promise.all([
        offlineService.getData('orders'),
        offlineService.getData('items')
      ]);

      const totalOrders = Array.isArray(orders) ? orders.length : 0;
      const totalRevenue = Array.isArray(orders) ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) : 0;
      const totalItems = Array.isArray(items) ? items.length : 0;
      const lowStockItems = Array.isArray(items) ? items.filter(item => item.stock_quantity < 10).length : 0;

      return {
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          totalItems,
          lowStockItems,
          todayOrders: totalOrders, // Simplified for offline
          todayRevenue: totalRevenue // Simplified for offline
        },
        offline: true
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return basic stats from local data
      return {
        success: true,
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          totalItems: 0,
          lowStockItems: 0,
          todayOrders: 0,
          todayRevenue: 0
        },
        offline: true,
        error: 'Using default stats due to error'
      };
    }
  }

  async getSalesAnalytics(): Promise<any> {
    try {
      // Generate basic sales analytics from local orders
      const orders = await offlineService.getData('orders');
      const salesData = Array.isArray(orders) ? orders.map(order => ({
        date: order.created_at || new Date().toISOString(),
        amount: order.total_amount || 0,
        orders: 1
      })) : [];

      return {
        success: true,
        data: salesData,
        offline: true
      };
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      return {
        success: true,
        data: [],
        offline: true,
        error: 'Using empty analytics due to error'
      };
    }
  }

  async getInventoryStatus(): Promise<any> {
    try {
      const items = await offlineService.getData('items');
      const inventoryData = Array.isArray(items) ? items.map(item => ({
        id: item.id,
        name: item.name,
        stock_quantity: item.stock_quantity || 0,
        status: item.stock_quantity > 10 ? 'in_stock' : item.stock_quantity > 0 ? 'low_stock' : 'out_of_stock'
      })) : [];

      return {
        success: true,
        data: inventoryData,
        offline: true
      };
    } catch (error) {
      console.error('Error fetching inventory status:', error);
      return {
        success: true,
        data: [],
        offline: true,
        error: 'Using empty inventory due to error'
      };
    }
  }
}

// Create singleton instance
const offlineAPI = new OfflineAPI();
export default offlineAPI;