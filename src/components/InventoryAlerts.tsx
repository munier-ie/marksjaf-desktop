import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, X, RefreshCw } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { toast } from 'sonner';
import { formatNairaSimple } from '../utils/currency';

interface LowStockItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  price: number;
  category_name?: string;
  status: string;
}

interface InventoryAlertsProps {
  onRefresh?: () => void;
}

const InventoryAlerts: React.FC<InventoryAlertsProps> = ({ onRefresh }) => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLowStockItems = async () => {
    try {
      setRefreshing(true);
      const response = await inventoryAPI.getLowStockItems();
      if (response.success) {
        setLowStockItems(response.items || []);
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      toast.error('Failed to fetch low stock alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLowStockItems();
  }, []);

  const handleQuickRestock = async (itemId: string, quantity: number) => {
    try {
      const response = await inventoryAPI.updateStock(itemId, quantity);
      if (response.success) {
        toast.success('Stock updated successfully');
        fetchLowStockItems();
        if (onRefresh) onRefresh();
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const getStockStatus = (item: LowStockItem) => {
    const percentage = (item.stock_quantity / item.low_stock_threshold) * 100;
    if (item.stock_quantity === 0) return { status: 'out-of-stock', color: 'text-red-600', bg: 'bg-red-50' };
    if (percentage <= 50) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (percentage <= 100) return { status: 'low', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="text-sm text-gray-600">Loading inventory alerts...</span>
        </div>
      </div>
    );
  }

  if (!showAlerts || lowStockItems.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">All items are well stocked!</span>
          </div>
          <button
            onClick={fetchLowStockItems}
            disabled={refreshing}
            className="text-green-600 hover:text-green-700 p-1 rounded"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Inventory Alerts</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
              {lowStockItems.length} items
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLowStockItems}
              disabled={refreshing}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title="Refresh alerts"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title="Dismiss alerts"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {lowStockItems.map((item) => {
          const stockStatus = getStockStatus(item);
          return (
            <div key={item.id} className={`p-4 border-b border-gray-100 last:border-b-0 ${stockStatus.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${stockStatus.color} bg-white`}>
                      {stockStatus.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>Current: <strong className={stockStatus.color}>{item.stock_quantity}</strong></span>
                    <span>Threshold: {item.low_stock_threshold}</span>
                    <span>Price: {formatNairaSimple(item.price)}</span>
                    {item.category_name && <span>Category: {item.category_name}</span>}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Quick restock buttons */}
                  <div className="flex space-x-1">
                    {[10, 25, 50].map((qty) => (
                      <button
                        key={qty}
                        onClick={() => handleQuickRestock(item.id, item.stock_quantity + qty)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        title={`Add ${qty} units`}
                      >
                        +{qty}
                      </button>
                    ))}
                  </div>
                  
                  {/* Stock level indicator */}
                  <div className="flex items-center space-x-1">
                    <TrendingDown className={`h-4 w-4 ${stockStatus.color}`} />
                    <span className={`text-sm font-medium ${stockStatus.color}`}>
                      {Math.round((item.stock_quantity / item.low_stock_threshold) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      item.stock_quantity === 0 
                        ? 'bg-red-500' 
                        : item.stock_quantity <= item.low_stock_threshold * 0.5
                        ? 'bg-red-500'
                        : item.stock_quantity <= item.low_stock_threshold
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (item.stock_quantity / (item.low_stock_threshold * 2)) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {lowStockItems.filter(item => item.stock_quantity === 0).length} out of stock, 
            {lowStockItems.filter(item => item.stock_quantity > 0 && item.stock_quantity <= item.low_stock_threshold).length} low stock
          </span>
          <button
            onClick={() => {
              if (onRefresh) onRefresh();
              fetchLowStockItems();
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Full Inventory
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryAlerts;