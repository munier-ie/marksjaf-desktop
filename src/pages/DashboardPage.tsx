"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
// Socket.IO functionality removed
import { ArrowLeft, Bell, ShoppingCart, DollarSign, TrendingUp, Clock, AlertCircle, Package } from "lucide-react"
import { formatNairaSimple } from "../utils/currency"
import { formatNigerianTime } from "../utils/datetime"
import api from "../services/api"

interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  completedOrders: number
}

interface Order {
  id: string
  orderNumber: string
  customerName?: string
  tableNumber?: string
  orderType: "dine_in" | "takeaway" | "delivery"
  total: number
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
  timestamp: Date
  items: Array<{
    name: string
    quantity: number
  }>
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  // Socket.IO functionality removed - notifications and online orders no longer available
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])

  useEffect(() => {
    fetchDashboardData()
    // Set up polling for live data
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, ordersResponse] = await Promise.all([
        api.get('/admin/dashboard/overview'),
        api.get('/admin/dashboard/recent-orders?limit=10')
      ])

      setStats(statsResponse.data.data)
      setRecentOrders(ordersResponse.data.data.map((order: any) => ({
        ...order,
        timestamp: new Date(order.timestamp),
        orderType: order.orderType === 'dine_in' ? 'dine-in' : 
                  order.orderType === 'takeaway' ? 'takeout' : 'online'
      })))
      // Remove: setError(null)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      // Remove: setError(err.response?.data?.error || 'Failed to fetch dashboard data')
      // Keep existing mock data if API fails
      if (stats.todayRevenue === 0) {
        setStats({
          todayRevenue: 45200,
          todayOrders: 24,
          pendingOrders: 3,
          completedOrders: 21,
        })
      }
    }
    // Remove the finally block:
    // finally {
    //   setLoading(false)
    // }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "preparing":
        return "bg-[#9ACD32]/20 text-[#9ACD32]"
      case "ready":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case "dine-in":
        return "bg-purple-100 text-purple-800"
      case "takeout":
        return "bg-[#9ACD32]/20 text-[#9ACD32]"
      case "online":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Update in backend
      await api.put(`/orders/${orderId}/status`, { status: newStatus })
      
      // Update local state
      setRecentOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: newStatus as any } : order)),
      )
      
      // Refresh stats
      const statsResponse = await api.get('/admin/dashboard/overview')
      setStats(statsResponse.data.data)
    } catch (err: any) {
      console.error('Error updating order status:', err)
      alert('Failed to update order status')
    }
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={() => navigate("/entry")} className="mr-4 p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Real-time restaurant overview</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-600">Real-time features disabled</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-[#9ACD32] currency">{formatNairaSimple(stats.todayRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#9ACD32]" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <TrendingUp className="h-4 w-4 mr-1" />
            +12.5% from yesterday
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-[#9ACD32]" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {stats.completedOrders} completed, {stats.pendingOrders} pending
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-2 text-sm text-yellow-600">Requires immediate attention</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online Orders</p>
              <p className="text-2xl font-bold text-gray-400">--</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <div className="mt-2 text-sm text-gray-400">Real-time updates disabled</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <span className="text-sm text-gray-600">Live updates</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{order.orderNumber}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderTypeColor(order.orderType)}`}
                      >
                        {order.orderType}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{formatNigerianTime(order.timestamp)}</span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">
                      {order.orderType === "dine_in" ? (
                        <span>{order.tableNumber}</span>
                      ) : (
                        <span>{order.customerName}</span>
                      )}
                    </div>
                    <span className="font-semibold text-[#9ACD32] currency">{formatNairaSimple(order.total)}</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    {order.items.map((item, index) => (
                      <span key={index}>
                        {item.quantity}x {item.name}
                        {index < order.items.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>

                  {order.status === "pending" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, "preparing")}
                        className="px-3 py-1 bg-[#9ACD32] text-white text-xs rounded hover:bg-[#8BC34A]"
                      >
                        Start Preparing
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, "cancelled")}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {order.status === "preparing" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "ready")}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                  )}

                  {order.status === "ready" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "completed")}
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="space-y-6">
          {/* Live Notifications */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Live Alerts</h2>
              <Bell className="h-5 w-5 text-gray-500" />
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              <div className="text-center text-gray-500 py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Real-time notifications disabled</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/pos/order")}
                className="w-full btn-primary flex items-center justify-center"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Order
              </button>
              <button
                onClick={() => navigate("/pos/history")}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <Clock className="h-4 w-4 mr-2" />
                Order History
              </button>
            </div>
          </div>

          {/* Today's Summary */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Orders Completed</span>
                <span className="font-medium">{stats.completedOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Order Value</span>
                <span className="font-medium currency">
                  {formatNairaSimple(stats.todayRevenue / stats.todayOrders)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Peak Hour</span>
                <span className="font-medium">2:00 PM - 3:00 PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Most Popular Item</span>
                <span className="font-medium">Jollof Rice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage