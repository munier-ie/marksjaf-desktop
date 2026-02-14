"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ShoppingCart, Printer, LogOut, User, Clock, Shield } from "lucide-react"
import { formatNigerianDateTime } from "../utils/datetime"

const EntryPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const currentTime = formatNigerianDateTime(new Date())

  const handlePOSClick = () => {
    navigate("/pos/order")
  }

  const handlePrinterClick = () => {
    navigate("/printer/management")
  }

  const handleAdminClick = () => {
    if (user?.role === "admin" || user?.role === "manager") {
      navigate("/admin/dashboard")
    } else {
      navigate("/admin/login")
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#9ACD32] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="ml-3 text-lg font-semibold text-gray-900">Marksjaf POS</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {currentTime}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                {user?.name} ({user?.role})
              </div>
              <button onClick={handleLogout} className="flex items-center text-sm text-red-600 hover:text-red-700">
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome, {user?.name}!</h1>
          <p className="text-xl text-gray-600">Choose your workspace to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* POS Card */}
          <div
            onClick={handlePOSClick}
            className="card hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-[#9ACD32]"
          >
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-[#9ACD32] rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">POS System</h2>
              <p className="text-gray-600 mb-6">
                Take orders, manage cart, process payments, and print receipts for dine-in and takeout customers.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Create new orders</p>
                <p>• Print receipts</p>
                <p>• View order history</p>
                <p>• Process payments</p>
              </div>
            </div>
          </div>

          {/* Printer Management Card */}
          <div
            onClick={handlePrinterClick}
            className="card hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-[#9ACD32]"
          >
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-[#9ACD32] rounded-full flex items-center justify-center mb-6">
                <Printer className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Printer Management</h2>
              <p className="text-gray-600 mb-6">
                Manage receipt printing, view recent receipts, and configure printing preferences for your POS system.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• View Recent Receipts</p>
                <p>• Reprint Past Orders</p>
                <p>• Test Receipt Generation</p>
                <p>• Printing Preferences</p>
              </div>
            </div>
          </div>

          {/* Admin Card */}
          <div
            onClick={handleAdminClick}
            className="card hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-red-500"
          >
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-6">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Portal</h2>
              <p className="text-gray-600 mb-6">
                Full administrative access to manage inventory, bookings, transactions, and staff.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Sales Analytics</p>
                <p>• Inventory Management</p>
                <p>• Staff Management</p>
                <p>• Booking Management</p>
              </div>
              {user?.role !== "admin" && user?.role !== "manager" && (
                <div className="mt-4 text-xs text-amber-600 bg-amber-50 p-2 rounded">Admin login required</div>
              )}
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}

export default EntryPage
