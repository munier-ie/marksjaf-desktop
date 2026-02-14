"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Search, Printer, Eye, Calendar, Filter, Download, RefreshCw } from "lucide-react"
import { formatNairaSimple } from "../utils/currency"
import { formatNigerianDateTime } from "../utils/datetime"
import api from '../services/api'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  category: string
}

interface Order {
  id: string
  orderNumber: string
  customerName?: string
  tableNumber?: string
  orderType: "dine-in" | "takeout" | "online" | "delivery"
  items: OrderItem[]
  total: number
  timestamp: Date
  status: "completed" | "cancelled" | "refunded"
  paymentMethod: "cash" | "card" | "transfer" | "pos"
  staff?: string
  notes?: string
}

interface OrderStats {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
}

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  // Remove this line since token is not used anymore
  // const { token } = useAuth() 
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch orders with pagination and filters
  // Replace the fetch calls with:
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '50',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(orderTypeFilter !== 'all' && { orderType: orderTypeFilter }),
        ...(selectedDate && { startDate: selectedDate, endDate: selectedDate }),
        ...(searchTerm && { search: searchTerm })
      })

      const data = await api.get(`/orders?${params}`)

      if (data.success) {
        setOrders(data.data.map((order: any) => ({
          ...order,
          timestamp: new Date(order.timestamp)
        })))
        setPagination(data.pagination)
      } else {
        throw new Error(data.message || 'Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch orders')
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, statusFilter, orderTypeFilter, selectedDate, searchTerm])

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedDate) {
        params.append('startDate', selectedDate)
        params.append('endDate', selectedDate)
      }

      const data = await api.get(`/orders/stats?${params}`)
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [selectedDate])

  // Initial load and when filters change
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    fetchStats()
  }, [fetchStats, selectedDate])

  const handleRefresh = () => {
    fetchOrders()
    fetchStats()
  }

  const handlePrintReceipt = async (order: Order) => {
    setIsLoading(true)
    try {
      // Call backend to reprint the receipt for this order
      // Use api service to handle base URL and auth headers automatically
      const data = await api.post(`/reprint-receipt/${order.id}`)

      if (data.success) {
        if (data.printed) {
          alert(`✅ Receipt for ${order.orderNumber} printed to thermal printer!`)
        } else {
          // Backend generated receipt but couldn't print (likely due to missing printer module)
          // Fallback to Electron printing if available
          if (window.electronAPI) {
            console.log("Backend printing skipped, trying Electron native print...")

            // Convert order to the format expected by electronAPI
            const receiptData = {
              businessName: 'MARKSJAF KITCHEN',
              address: 'Shop 1 Modibbo Plaza, Yahaya Guasau\nSharada, Kano, Nigeria',
              phone: '+234 8032549466',
              email: 'hello@marksjafkitchen.com.ng',
              orderNumber: order.orderNumber,
              date: order.timestamp.toISOString(),
              orderType: order.orderType,
              paymentMethod: order.paymentMethod,
              paymentDetails: order.paymentMethod === 'card' || order.paymentMethod === 'pos' ? 'Card/POS Payment' : 'Cash/Transfer',
              status: order.status,
              customerName: order.customerName || 'Walk-in Customer',
              tableNumber: order.tableNumber,
              staff: order.staff || 'System',
              items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
              })),
              total: order.total
            }

            const result = await window.electronAPI.printReceipt(receiptData)
            if (result.success) {
              alert(`✅ Receipt for ${order.orderNumber} printed via System Print!`)
            } else {
              throw new Error(result.error || 'System print failed')
            }
          } else {
            alert(`📄 Receipt generated for ${order.orderNumber} (check backend console)`)
          }
        }
      } else {
        throw new Error(data.message || data.error || 'Print failed')
      }


    } catch (error: any) {
      console.error("Print failed:", error)
      alert(error.message || "Failed to print receipt - check printer connection")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "refunded":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "cash":
        return "bg-green-50 text-green-700"
      case "card":
        return "bg-[#9ACD32]/20 text-[#9ACD32]"
      case "transfer":
        return "bg-purple-50 text-purple-700"
      case "pos":
        return "bg-indigo-50 text-indigo-700"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case "dine-in":
        return "bg-[#9ACD32]/20 text-[#9ACD32]"
      case "takeout":
        return "bg-orange-50 text-orange-700"
      case "online":
        return "bg-green-50 text-green-700"
      case "delivery":
        return "bg-purple-50 text-purple-700"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/entry")}
            className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
            <p className="text-gray-600">View and manage past orders</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn-secondary flex items-center disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-[#9ACD32] bg-opacity-10 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-[#9ACD32]" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-[#9ACD32] currency">{formatNairaSimple(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-[#9ACD32] bg-opacity-10 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-[#9ACD32]" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Filter className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field"
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          <select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)} className="input-field">
            <option value="all">All Types</option>
            <option value="dine-in">Dine-In</option>
            <option value="takeout">Takeout</option>
            <option value="online">Online</option>
          </select>

          <button className="btn-primary flex items-center justify-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {!isLoading && orders.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or select a different date</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-600">{formatNigerianDateTime(order.timestamp)}</p>
                  </div>

                  <div className="flex space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderTypeColor(order.orderType)}`}
                    >
                      {order.orderType.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(order.paymentMethod)}`}
                    >
                      {order.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePrintReceipt(order)}
                    disabled={isLoading}
                    className="p-2 hover:bg-[#9ACD32] hover:bg-opacity-10 rounded-lg text-[#9ACD32] transition-colors disabled:opacity-50"
                    title="Print Receipt"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Customer/Table: </span>
                  <span className="font-medium">
                    {order.orderType === "dine-in" ? order.tableNumber : order.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Staff: </span>
                  <span className="font-medium">{order.staff || "System"}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Total: </span>
                  <span className="font-bold text-[#9ACD32] currency">{formatNairaSimple(order.total)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Items: </span>
                    {order.items.slice(0, 3).map((item, index) => (
                      <span key={index}>
                        {item.quantity}x {item.name}
                        {index < Math.min(order.items.length, 3) - 1 ? ", " : ""}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-[#9ACD32] font-medium"> +{order.items.length - 3} more</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Note: </span>
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Order Details</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>

              {/* Order Header */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-600">Order Number:</span> {selectedOrder.orderNumber}
                      </p>
                      <p>
                        <span className="text-gray-600">Date & Time:</span>{" "}
                        {formatNigerianDateTime(selectedOrder.timestamp)}
                      </p>
                      <p>
                        <span className="text-gray-600">Type:</span>{" "}
                        <span className="capitalize">{selectedOrder.orderType}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Status:</span>{" "}
                        <span className="capitalize">{selectedOrder.status}</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Customer & Payment</h4>
                    <div className="space-y-1 text-sm">
                      {selectedOrder.orderType === "dine-in" ? (
                        <p>
                          <span className="text-gray-600">Table:</span> {selectedOrder.tableNumber}
                        </p>
                      ) : (
                        <p>
                          <span className="text-gray-600">Customer:</span> {selectedOrder.customerName}
                        </p>
                      )}
                      <p>
                        <span className="text-gray-600">Payment:</span>{" "}
                        <span className="capitalize">{selectedOrder.paymentMethod}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Staff:</span> {selectedOrder.staff || "System"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.category}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × {formatNairaSimple(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-[#9ACD32] currency">
                        {formatNairaSimple(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-[#9ACD32] currency">
                    {formatNairaSimple(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setSelectedOrder(null)} className="flex-1 btn-secondary">
                  Close
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  disabled={isLoading}
                  className="flex-1 btn-primary flex items-center justify-center disabled:opacity-50"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {isLoading ? "Printing..." : "Print Receipt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderHistoryPage
