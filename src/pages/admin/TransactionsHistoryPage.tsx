"use client"

import type React from "react"
import { useEffect } from 'react';
import { useState } from "react"
import AdminLayout from "../../components/AdminLayout"
import { Search, Download, Eye, CreditCard, X, Trash2, Loader2 } from "lucide-react"
import { formatNairaSimple } from "../../utils/currency"
import { formatNigerianDateTime } from "../../utils/datetime"

import { transactionsAPI } from '../../services/api';

interface Transaction {
  id: string
  orderNumber: string
  customerName?: string
  tableNumber?: string
  orderType: "dine-in" | "takeout" | "online"
  amount: number
  paymentMethod: "cash" | "card" | "transfer" | "pos"
  status: "completed" | "pending" | "failed" | "refunded"
  timestamp: Date
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  staff?: string
  notes?: string
}

interface TransactionStats {
  total: number
  totalAmount: number
  completed: number
  failed: number
  refunded: number
}

const TransactionsHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionStats, setTransactionStats] = useState<TransactionStats>({
    total: 0,
    totalAmount: 0,
    completed: 0,
    failed: 0,
    refunded: 0
  });

  // Debounce search term - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load data when filters change (including debounced search term)
  useEffect(() => {
    loadTransactions();
    loadTransactionStats();
  }, [statusFilter, paymentFilter, dateFrom, dateTo, debouncedSearchTerm]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionsAPI.getTransactions({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        search: debouncedSearchTerm || undefined,
      });

      if (response.success) {
        // Convert timestamp strings to Date objects
        const transactionsWithDates = response.data.transactions.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));
        setTransactions(transactionsWithDates);
      } else {
        setError(response.message || 'Failed to load transactions');
      }
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionStats = async () => {
    try {
      const response = await transactionsAPI.getTransactionStats({
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      if (response.success) {
        setTransactionStats(response.data);
      }
    } catch (err) {
      console.error('Error loading transaction stats:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100"
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "failed":
        return "text-red-600 bg-red-100"
      case "refunded":
        return "text-purple-600 bg-purple-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "cash":
        return "text-green-600 bg-green-100"
      case "card":
        return "text-[#9ACD32] bg-[#9ACD32]/20"
      case "transfer":
        return "text-purple-600 bg-purple-100"
      case "pos":
        return "text-indigo-600 bg-indigo-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case "dine-in":
        return "text-[#9ACD32] bg-[#9ACD32]/20"
      case "takeout":
        return "text-orange-600 bg-orange-100"
      case "online":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }



  const handleCancel = async (transactionId: string) => {
    if (!confirm('Are you sure you want to cancel this transaction?')) {
      return;
    }

    try {
      const response = await transactionsAPI.cancelTransaction(transactionId);

      if (response.success) {
        alert('Transaction cancelled successfully');
        await loadTransactions(); // Reload the list
        await loadTransactionStats(); // Update stats
      } else {
        alert(response.message || 'Failed to cancel transaction');
      }
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      alert('Failed to cancel transaction');
    }
  };

  const handleDelete = async (transactionId: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete transaction ${orderNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await transactionsAPI.deleteTransaction(transactionId);

      if (response.success) {
        alert('Transaction deleted successfully');
        await loadTransactions(); // Reload the list
        await loadTransactionStats(); // Update stats
      } else {
        alert(response.message || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  // Only show error state as full page, not loading
  if (error && !loading) {
    return (
      <AdminLayout title="Transactions History" subtitle="View and manage all payment transactions">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Transactions History" subtitle="View and manage all payment transactions">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{transactionStats.total}</p>
            </div>
            <CreditCard className="h-8 w-8 text-[#9ACD32]" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-[#9ACD32] currency">
                {formatNairaSimple(transactionStats.totalAmount)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-[#9ACD32]" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{transactionStats.completed}</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed/Refunded</p>
              <p className="text-2xl font-bold text-red-600">{transactionStats.failed + transactionStats.refunded}</p>
            </div>
            <CreditCard className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by order number, customer name, or table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative group">
              <button className="btn-primary flex items-center shadow-sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-20 hidden group-hover:block border border-gray-100 ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Download As</span>
                </div>
                {[
                  { id: 'csv', label: 'CSV File', icon: '📄', desc: 'Universal format' },
                  { id: 'xlsx', label: 'Excel Spreadsheet', icon: '📊', desc: 'Best for analysis' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={async () => {
                      try {
                        const blob = await transactionsAPI.exportTransactions({
                          format: item.id as any,
                          status: statusFilter !== 'all' ? statusFilter : undefined,
                          paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
                          startDate: dateFrom || undefined,
                          endDate: dateTo || undefined,
                        });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `transactions-export.${item.id}`;
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="input-field">
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field"
              placeholder="From Date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field"
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Transaction</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Customer/Table</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Payment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Date & Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-[#9ACD32] animate-spin mb-2" />
                      <p className="text-gray-500 text-sm">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{transaction.orderNumber}</p>
                        {transaction.staff && <p className="text-sm text-gray-600">Staff: {transaction.staff}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {transaction.orderType === "dine-in" ? (
                        <span className="font-medium">{transaction.tableNumber}</span>
                      ) : (
                        <span className="font-medium">{transaction.customerName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderTypeColor(transaction.orderType)}`}
                      >
                        {transaction.orderType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold currency">{formatNairaSimple(transaction.amount)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(transaction.paymentMethod)}`}
                      >
                        {transaction.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatNigerianDateTime(transaction.timestamp)}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(transaction.status === 'pending') && (
                          <>
                            <button
                              onClick={() => handleCancel(transaction.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="Cancel Transaction"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id, transaction.orderNumber)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && transactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                <button onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Transaction Information</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600">Order Number:</span> {selectedTransaction.orderNumber}
                    </p>
                    <p>
                      <span className="text-gray-600">Date & Time:</span>{" "}
                      {formatNigerianDateTime(selectedTransaction.timestamp)}
                    </p>
                    <p>
                      <span className="text-gray-600">Type:</span>{" "}
                      <span className="capitalize">{selectedTransaction.orderType}</span>
                    </p>
                    {selectedTransaction.orderType === "dine-in" ? (
                      <p>
                        <span className="text-gray-600">Table:</span> {selectedTransaction.tableNumber}
                      </p>
                    ) : (
                      <p>
                        <span className="text-gray-600">Customer:</span> {selectedTransaction.customerName}
                      </p>
                    )}
                    <p>
                      <span className="text-gray-600">Payment Method:</span>{" "}
                      <span className="uppercase">{selectedTransaction.paymentMethod}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Status:</span>{" "}
                      <span className="capitalize">{selectedTransaction.status}</span>
                    </p>
                    {selectedTransaction.staff && (
                      <p>
                        <span className="text-gray-600">Processed by:</span> {selectedTransaction.staff}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Items</h4>
                  <div className="space-y-2">
                    {selectedTransaction.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium currency">{formatNairaSimple(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-[#9ACD32] currency">
                      {formatNairaSimple(selectedTransaction.amount)}
                    </span>
                  </div>
                </div>

                {selectedTransaction.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">{selectedTransaction.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default TransactionsHistoryPage
