"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { BarChart3, Package, CreditCard, Users, LogOut, Menu, X, User, Clock } from "lucide-react"
import { formatNigerianDateTime } from "../utils/datetime"

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const currentTime = formatNigerianDateTime(new Date())

  const navigationItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
    { name: "Inventory", href: "/admin/inventory", icon: Package },
    { name: "Transactions", href: "/admin/transactions", icon: CreditCard },
    { name: "Staff Management", href: "/admin/staff", icon: Users },
  ]

  const handleLogout = () => {
    logout()
    navigate("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:translate-x-0 transition duration-200 ease-in-out`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#9ACD32] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">Marksjaf Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`${
                    isActive
                      ? "bg-[#9ACD32] text-white shadow-sm"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  } group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                >
                  <Icon
                    className={`${
                      isActive ? "text-white" : "text-gray-400 group-hover:text-gray-500"
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  {item.name}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/entry")}
            className="w-full text-left text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            ← Back to POS
          </button>
          <button onClick={handleLogout} className="w-full flex items-center text-sm text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-0 lg:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3 p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-gray-600">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {currentTime}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                {user?.name}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default AdminLayout
