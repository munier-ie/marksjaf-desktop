"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AdminLayout from "../../components/AdminLayout"
import { DollarSign, ShoppingCart, Calendar, TrendingUp, Package, RefreshCw } from "lucide-react"
import { formatNairaSimple } from "../../utils/currency"
import { dashboardAPI } from "../../services/api"

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalBookings: number;
  totalTransactions: number;
  completedOrders: number;
  inventory: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
}

interface SalesData {
  date: string;
  orders: number;
  revenue: number;
}

interface InventoryStatus {
  summary: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockUnits: number;
    averageStockLevel: number;
  };
  lowStockItems: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
    category: string;
  }>;
}

const AdminDashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly")
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null)

      // Fetch dashboard data individually to isolate failures
      let statsResult, salesResult, inventoryResult;

      try {
        statsResult = await dashboardAPI.getDashboardStats();
        if (statsResult.success) setDashboardStats(statsResult.data);
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      }

      try {
        salesResult = await dashboardAPI.getSalesAnalytics({ period: timeRange, limit: timeRange === 'daily' ? 7 : timeRange === 'weekly' ? 12 : timeRange === 'monthly' ? 12 : 5 });
        if (salesResult.success) setSalesData(salesResult.data.salesData);
      } catch (e) {
        console.error("Failed to load sales analytics", e);
      }

      try {
        inventoryResult = await dashboardAPI.getInventoryStatus();
        if (inventoryResult.success) setInventoryStatus(inventoryResult.data);
      } catch (e) {
        console.error("Failed to load inventory status", e);
      }



    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh data manually
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Fetch sales data when time range changes
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const salesResponse = await dashboardAPI.getSalesAnalytics({
          period: timeRange,
          limit: timeRange === 'daily' ? 7 : timeRange === 'weekly' ? 12 : timeRange === 'monthly' ? 12 : 5
        })

        if (salesResponse.success) {
          setSalesData(salesResponse.data.salesData)
        }
      } catch (err) {
        console.error('Error fetching sales data:', err)
      }
    }

    fetchSalesData()
  }, [timeRange])

  // Calculate derived values from real data
  const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0)
  const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const maxRevenue = salesData.length > 0 ? Math.max(...salesData.map((item) => item.revenue)) : 1

  // Format period labels
  const formatPeriodLabel = (dateString: string, period: string) => {
    const date = new Date(dateString)
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { weekday: 'short' })
      case 'weekly':
        // For weekly view, show relative week numbers starting from Week 1
        // Find the earliest date in salesData to use as Week 1
        if (salesData.length > 0) {
          const sortedDates = salesData.map(item => new Date(item.date)).sort((a, b) => a.getTime() - b.getTime())
          const firstWeek = sortedDates[0]
          const currentDate = new Date(dateString)
          const weeksDiff = Math.floor((currentDate.getTime() - firstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
          return `Week ${weeksDiff}`
        }
        return `Week 1`
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short' })
      case 'yearly':
        return date.getFullYear().toString()
      default:
        return dateString
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard" subtitle="Restaurant management overview and analytics">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9ACD32]"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="Admin Dashboard" subtitle="Restaurant management overview and analytics">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="btn-primary text-sm"
              disabled={refreshing}
            >
              {refreshing ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Restaurant management overview and analytics">
      {/* Actions */}
      <div className="flex justify-end mb-4 space-x-2">
        <div className="relative group">
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#9ACD32] hover:bg-[#8bb82d] text-white rounded-lg transition-colors shadow-sm">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">Export Report</span>
          </button>
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-20 hidden group-hover:block border border-gray-100 ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Download As</span>
            </div>
            {[
              { id: 'xlsx', label: 'Excel Spreadsheet', icon: '📊', desc: 'Best for analysis' },
              { id: 'csv', label: 'CSV File', icon: '📄', desc: 'Universal format' },
              { id: 'txt', label: 'Text Report', icon: '📝', desc: 'Simple summary' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={async () => {
                  try {
                    const blob = await dashboardAPI.exportAnalytics({ format: item.id as any, startDate: undefined, endDate: undefined });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dashboard-analytics.${item.id}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error('Export failed', e);
                    alert('Export failed');
                  }
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start space-x-3 transition-colors group/item"
              >
                <span className="text-xl group-hover/item:scale-110 transition-transform">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-700">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-[#9ACD32] currency">
                {formatNairaSimple(dashboardStats?.totalRevenue || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-[#9ACD32]" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <TrendingUp className="h-4 w-4 mr-1" />
            All time revenue
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{(dashboardStats?.totalTransactions || 0).toLocaleString()}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-[#9ACD32]" />
          </div>
          <div className="mt-2 text-sm text-gray-600">Across all channels</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-purple-600">{dashboardStats?.totalBookings || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2 text-sm text-purple-600">Table reservations</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-[#9ACD32]">{dashboardStats?.totalOrders || 0}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-[#9ACD32]" />
          </div>
          <div className="mt-2 text-sm text-[#9ACD32]">All time orders</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sales Analytics</h2>
                <p className="text-sm text-gray-600">Revenue and orders over time</p>
              </div>
              <div className="flex space-x-2">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${timeRange === range ? "bg-[#9ACD32] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-4">
              {salesData.length > 0 ? (
                salesData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-16 text-sm font-medium text-gray-600">
                      {formatPeriodLabel(item.date, timeRange)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Revenue</span>
                        <span className="text-sm font-medium currency">{formatNairaSimple(item.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#9ACD32] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-sm text-gray-600">{item.orders} orders</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No sales data available for the selected period
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-lg font-bold text-[#9ACD32] currency">{formatNairaSimple(totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-lg font-bold text-gray-900">{totalOrders.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg. Order Value</p>
                  <p className="text-lg font-bold text-[#9ACD32] currency">{formatNairaSimple(averageOrderValue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Inventory Alert */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Status</h3>
              <Package className="h-5 w-5 text-gray-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Items</span>
                <span className="font-medium">{inventoryStatus?.summary.totalItems || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Low Stock Items</span>
                <span className="font-medium text-red-600">{inventoryStatus?.summary.lowStockCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Out of Stock</span>
                <span className="font-medium text-red-600">{inventoryStatus?.summary.outOfStockCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">In Stock</span>
                <span className="font-medium text-green-600">
                  {(inventoryStatus?.summary.totalItems || 0) - (inventoryStatus?.summary.lowStockCount || 0) - (inventoryStatus?.summary.outOfStockCount || 0)}
                </span>
              </div>
            </div>
            {(inventoryStatus?.summary.lowStockCount || 0) > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>{inventoryStatus?.summary.lowStockCount}</strong> items need restocking
                </p>
              </div>
            )}
            {(inventoryStatus?.summary.outOfStockCount || 0) > 0 && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>{inventoryStatus?.summary.outOfStockCount}</strong> items are out of stock
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboardPage
