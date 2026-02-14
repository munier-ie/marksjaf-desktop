import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, Calendar, Filter } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { formatNairaSimple } from '../utils/currency';
import { toast } from 'sonner';

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  activeItems: number;
  inactiveItems: number;
  averagePrice: number;
  totalStockQuantity: number;
}

interface CategoryStats {
  name: string;
  itemCount: number;
  totalValue: number;
  lowStockCount: number;
}

interface StockMovement {
  date: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
}

const InventoryDashboard: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch inventory statistics
      const [statsResponse, categoriesResponse, movementsResponse] = await Promise.all([
        inventoryAPI.getInventoryStats(),
        inventoryAPI.getCategoryStats(),
        inventoryAPI.getStockMovements({ timeRange, category: selectedCategory })
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
      
      if (categoriesResponse.success) {
        setCategoryStats(categoriesResponse.categories || []);
      }
      
      if (movementsResponse.success) {
        setStockMovements(movementsResponse.movements || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, selectedCategory]);

  const getStockHealthColor = (lowStock: number, total: number) => {
    const percentage = (lowStock / total) * 100;
    if (percentage > 20) return 'text-red-600';
    if (percentage > 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case 'in': return { label: 'Stock In', color: 'text-green-600', bg: 'bg-green-50' };
      case 'out': return { label: 'Stock Out', color: 'text-red-600', bg: 'bg-red-50' };
      case 'adjustment': return { label: 'Adjustment', color: 'text-blue-600', bg: 'bg-blue-50' };
      default: return { label: type, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h2>
          <p className="text-gray-600">Overview of your inventory performance and health</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categoryStats.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{stats.activeItems}</span>
              <span className="text-gray-600 ml-1">active, </span>
              <span className="text-gray-600 ml-1">{stats.inactiveItems} inactive</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatNairaSimple(stats.totalValue)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Avg: {formatNairaSimple(stats.averagePrice)}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Health</p>
                <p className={`text-2xl font-bold ${getStockHealthColor(stats.lowStockItems + stats.outOfStockItems, stats.totalItems)}`}>
                  {Math.round(((stats.totalItems - stats.lowStockItems - stats.outOfStockItems) / stats.totalItems) * 100)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-red-600 font-medium">{stats.outOfStockItems}</span>
              <span className="text-gray-600 ml-1">out of stock</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowStockItems}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Requires attention</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {categoryStats.slice(0, 6).map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      <span className="text-sm text-gray-600">{category.itemCount} items</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (category.totalValue / (stats?.totalValue || 1)) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{formatNairaSimple(category.totalValue)}</span>
                      {category.lowStockCount > 0 && (
                        <span className="text-xs text-red-600 font-medium">
                          {category.lowStockCount} low stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stockMovements.slice(0, 10).map((movement, index) => {
                const typeInfo = formatMovementType(movement.type);
                return (
                  <div key={index} className={`p-3 rounded-lg ${typeInfo.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{movement.itemName}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeInfo.color} bg-white`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            Qty: <span className={`font-medium ${movement.type === 'out' ? 'text-red-600' : 'text-green-600'}`}>
                              {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                            </span>
                          </span>
                          <span className="text-xs text-gray-500">{movement.date}</span>
                        </div>
                        {movement.reason && (
                          <p className="text-xs text-gray-500 mt-1">{movement.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {stockMovements.length === 0 && (
                <div className="text-center py-8">
                  <TrendingDown className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No stock movements in selected period</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <Package className="h-6 w-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Add New Item</h4>
            <p className="text-sm text-gray-600">Create a new inventory item</p>
          </button>
          
          <button className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mb-2" />
            <h4 className="font-medium text-gray-900">Review Alerts</h4>
            <p className="text-sm text-gray-600">Check low stock items</p>
          </button>
          
          <button className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Generate Report</h4>
            <p className="text-sm text-gray-600">Export inventory data</p>
          </button>
          
          <button className="p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left">
            <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Bulk Update</h4>
            <p className="text-sm text-gray-600">Update multiple items</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;