"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AdminLayout from "../../components/AdminLayout"
import { Calendar, Clock, Users, Phone, Plus, Search, Edit, Trash2, CheckCircle, X, Download } from "lucide-react"
import { formatNigerianDate } from "../../utils/datetime"
import { bookingsAPI } from "../../services/api"

// Updated Booking interface to match API response
interface Booking {
  id: string
  user_id?: string
  customer_name?: string
  phone_number: string
  email?: string
  consultancy_type: string
  session_datetime: string
  description?: string
  amount: number
  duration_minutes?: number
  status: "pending" | "confirmed" | "cancelled" | "completed"
  created_at: string
  updated_at: string
}

interface BookingStats {
  total: number
  confirmed: number
  pending: number
  today: number
}

// Helper functions for safe date formatting
const formatSafeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Invalid Date'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'

  return formatNigerianDate(date)
}

const formatSafeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Invalid Time'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Time'

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const BookingsManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    total: 0,
    confirmed: 0,
    pending: 0,
    today: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load bookings and stats
  const loadBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (dateFilter) {
        params.startDate = dateFilter
        params.endDate = dateFilter
      }
      if (searchTerm) params.search = searchTerm

      const [bookingsResponse, statsResponse] = await Promise.all([
        bookingsAPI.getBookings(params),
        bookingsAPI.getBookingStats(params)
      ])

      // Handle bookings response
      if (bookingsResponse.success) {
        setBookings(bookingsResponse.data || [])
      } else {
        console.error('Bookings API error:', bookingsResponse)
        setBookings([])
        setError('Failed to load bookings')
      }

      // Handle stats response
      if (statsResponse.success) {
        setBookingStats(statsResponse.data || {
          total: 0,
          confirmed: 0,
          pending: 0,
          today: 0
        })
      } else {
        console.error('Stats API error:', statsResponse)
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
      setError('Failed to load bookings')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [statusFilter, dateFilter, searchTerm])

  // Fixed filtering logic
  const filteredBookings = bookings.filter((booking) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    const customerName = booking.customer_name || ''
    const phoneNumber = booking.phone_number || ''
    const consultancyType = booking.consultancy_type || ''

    return (
      customerName.toLowerCase().includes(searchLower) ||
      phoneNumber.includes(searchTerm) ||
      consultancyType.toLowerCase().includes(searchLower)
    )
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-600 bg-green-100"
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "cancelled":
        return "text-red-600 bg-red-100"
      case "completed":
        return "text-gray-600 bg-gray-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const updateBookingStatus = async (id: string, status: Booking["status"]) => {
    try {
      const response = await bookingsAPI.updateBookingStatus(id, status)
      if (response.success) {
        await loadBookings() // Reload data
      } else {
        setError('Failed to update booking status')
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      setError('Failed to update booking status')
    }
  }

  const handleAddBooking = async (newBooking: any) => {
    try {
      const bookingData = {
        user_id: undefined,
        consultancy_type: newBooking.consultancy_type || 'General Consultation',
        session_datetime: newBooking.session_datetime,
        description: newBooking.description || '',
        phone_number: newBooking.phone_number,
        amount: newBooking.amount || 20000,
        duration_minutes: newBooking.duration_minutes || 60
      }

      const response = await bookingsAPI.createBooking(bookingData)
      if (response.success) {
        setShowAddModal(false)
        await loadBookings()
      } else {
        setError('Failed to create booking')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      setError('Failed to create booking')
    }
  }

  const handleEditBooking = async (updatedBooking: any) => {
    try {
      // Parse the datetime to extract date and time components
      const sessionDate = new Date(updatedBooking.session_datetime);
      const date = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = sessionDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

      const bookingData = {
        customerName: updatedBooking.customer_name,
        customerPhone: updatedBooking.phone_number,
        customerEmail: updatedBooking.email,
        consultancyType: updatedBooking.consultancy_type || 'General Consultation',
        date: date,
        time: time,
        status: updatedBooking.status || 'pending',
        specialRequests: updatedBooking.description || '',
        duration: updatedBooking.duration_minutes || 60,
        amount: updatedBooking.amount || 20000
      }

      const response = await bookingsAPI.updateBooking(updatedBooking.id, bookingData)
      if (response.success) {
        setEditingBooking(null)
        await loadBookings()
      } else {
        setError('Failed to update booking')
      }
    } catch (error) {
      console.error('Error updating booking:', error)
      setError('Failed to update booking')
    }
  }

  const handleDeleteBooking = async (id: string) => {
    if (confirm("Are you sure you want to delete this booking?")) {
      try {
        const response = await bookingsAPI.deleteBooking(id)
        if (response.success) {
          await loadBookings()
        } else {
          setError('Failed to delete booking')
        }
      } catch (error) {
        console.error('Error deleting booking:', error)
        setError('Failed to delete booking')
      }
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Bookings Management" subtitle="Manage consultancy bookings">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading bookings...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="Bookings Management" subtitle="Manage consultancy bookings">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Bookings Management" subtitle="Manage consultancy bookings">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{bookingStats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-[#9ACD32]" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-green-600">{bookingStats.confirmed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{bookingStats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-purple-600">{bookingStats.today}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by customer name, phone, or consultation type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex space-x-2">
            <div className="relative group">
              <button className="btn-secondary flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block border border-gray-200">
                {['csv', 'xlsx'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={async () => {
                      try {
                        const blob = await bookingsAPI.exportBookings({
                          format: fmt,
                          status: statusFilter !== 'all' ? statusFilter : undefined,
                          startDate: dateFilter || undefined,
                          endDate: dateFilter || undefined,
                        });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `bookings-export.${fmt}`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch (e) {
                        console.error('Export failed', e);
                        alert('Export failed');
                      }
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 uppercase"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Consultation</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Date & Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{booking.customer_name || 'N/A'}</p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {booking.phone_number}
                      </p>
                      {booking.email && <p className="text-sm text-gray-600">{booking.email}</p>}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{booking.consultancy_type}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{formatSafeDate(booking.session_datetime)}</p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatSafeTime(booking.session_datetime)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-500" />
                      {booking.duration_minutes || 60} min
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">₦{booking.amount?.toLocaleString() || '0'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {booking.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, "confirmed")}
                            className="p-1 hover:bg-green-100 rounded text-green-600"
                            title="Confirm"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, "cancelled")}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditingBooking(booking)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== 'all' || dateFilter
                ? 'No bookings found matching your criteria.'
                : 'No bookings available.'}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingBooking) && (
        <BookingModal
          booking={editingBooking}
          onSave={editingBooking ? handleEditBooking : handleAddBooking}
          onClose={() => {
            setShowAddModal(false)
            setEditingBooking(null)
          }}
        />
      )}
    </AdminLayout>
  )
}

// Booking Modal Component
interface BookingModalProps {
  booking?: Booking | null
  onSave: (booking: any) => void
  onClose: () => void
}

const BookingModal: React.FC<BookingModalProps> = ({ booking, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    customer_name: booking?.customer_name || "",
    phone_number: booking?.phone_number || "",
    email: booking?.email || "",
    consultancy_type: booking?.consultancy_type || "General Consultation",
    session_datetime: booking?.session_datetime
      ? (() => {
        const date = new Date(booking.session_datetime)
        return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16)
      })()
      : "",
    description: booking?.description || "",
    amount: booking?.amount || 20000,
    duration_minutes: booking?.duration_minutes || 60,
    status: booking?.status || "pending",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const bookingData = {
      ...formData,
      session_datetime: new Date(formData.session_datetime).toISOString(),
    }
    onSave(booking ? { ...booking, ...bookingData } : bookingData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{booking ? "Edit Booking" : "New Booking"}</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultancy Type</label>
              <select
                value={formData.consultancy_type}
                onChange={(e) => setFormData({ ...formData, consultancy_type: e.target.value })}
                className="input-field"
                required
              >
                <option value="General Consultation">General Consultation</option>
                <option value="Business Advisory">Business Advisory</option>
                <option value="Financial Planning">Financial Planning</option>
                <option value="Legal Consultation">Legal Consultation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.session_datetime}
                onChange={(e) => setFormData({ ...formData, session_datetime: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="240"
                  step="30"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="input-field bg-gray-100 cursor-not-allowed"
                  disabled
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Booking["status"] })}
                className="input-field"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description/Notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Any special requests or notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="submit" className="flex-1 btn-primary">
                {booking ? "Update Booking" : "Create Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BookingsManagementPage
