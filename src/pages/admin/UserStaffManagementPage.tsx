"use client"

import type React from "react"
import { useState } from "react"
import AdminLayout from "../../components/AdminLayout"
import { Plus, Search, Edit, Trash2, Users, UserCheck, Shield, Eye, EyeOff } from "lucide-react"
import { userManagementAPI } from '../../services/api';
import { useEffect } from 'react';

interface Staff {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  role: "admin" | "staff" | "customer"
  is_active: boolean
  is_email_verified: boolean
  created_at: Date
  updated_at: Date
  permissions?: string[]
  password?: string
}

const UserStaffManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Replace mock data with real state
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffStats, setStaffStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
  })

  // Load data from API
  useEffect(() => {
    loadUsers();
    loadStats();
  }, [roleFilter, statusFilter, searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userManagementAPI.getUsers({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
      });

      if (response.success) {
        setStaff(response.data.users);
      } else {
        setError(response.message || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await userManagementAPI.getUserStats();
      if (response.success) {
        setStaffStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleAddStaff = async (newStaff: Omit<Staff, "id" | "created_at" | "updated_at">) => {
    try {
      const response = await userManagementAPI.createUser({
        first_name: newStaff.first_name,
        last_name: newStaff.last_name,
        email: newStaff.email,
        phone_number: newStaff.phone_number,
        role: newStaff.role,
        is_active: newStaff.is_active,
        password: newStaff.password || '',
        permissions: newStaff.permissions,
      });

      if (response.success) {
        setShowAddModal(false);
        loadUsers();
        loadStats();
      } else {
        alert(response.message || 'Failed to create user');
      }
    } catch (err) {
      alert('Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  const handleEditStaff = async (updatedStaff: Staff) => {
    try {
      // Create update payload
      const updatePayload: any = {
        first_name: updatedStaff.first_name,
        last_name: updatedStaff.last_name,
        email: updatedStaff.email,
        phone_number: updatedStaff.phone_number,
        role: updatedStaff.role,
        is_active: updatedStaff.is_active,
        permissions: updatedStaff.permissions,
      };

      // Only include password if it's set (for password change)
      if (updatedStaff.password) {
        updatePayload.password = updatedStaff.password;
      }

      const response = await userManagementAPI.updateUser(updatedStaff.id, updatePayload);

      if (response.success) {
        setEditingStaff(null);
        loadUsers();
        loadStats();
      } else {
        alert(response.message || 'Failed to update user');
      }
    } catch (err) {
      alert('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      try {
        const response = await userManagementAPI.deleteUser(id);

        if (response.success) {
          loadUsers();
          loadStats();
        } else {
          alert(response.message || 'Failed to delete user');
        }
      } catch (err) {
        alert('Failed to delete user');
        console.error('Error deleting user:', err);
      }
    }
  };

  const filteredStaff = staff; // API already handles filtering

  // Add loading and error states to your JSX
  if (loading) {
    return (
      <AdminLayout title="Staff Management" subtitle="Manage staff members, roles and permissions">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Staff Management" subtitle="Manage staff members, roles and permissions">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </AdminLayout>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-100"
      case "staff":
        return "text-green-600 bg-green-100"
      case "customer":
        return "text-[#9ACD32] bg-[#9ACD32]/20"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "text-green-600 bg-green-100"
      : "text-red-600 bg-red-100"
  }

  return (
    <AdminLayout title="Staff Management" subtitle="Manage staff members, roles and permissions">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staffStats.total}</p>
            </div>
            <Users className="h-8 w-8 text-[#9ACD32]" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-bold text-green-600">{staffStats.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Staff</p>
              <p className="text-2xl font-bold text-yellow-600">{staffStats.inactive}</p>
            </div>
            <Users className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-red-600">{staffStats.admins}</p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search staff by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Staff Member</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Email Verified</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Join Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-gray-600">ID: {member.id}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm">{member.email}</p>
                      <p className="text-sm text-gray-600">{member.phone_number}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.is_active)}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.is_email_verified ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'}`}>
                      {member.is_email_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{new Date(member.created_at).toLocaleDateString("en-NG")}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
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
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingStaff) && (
        <StaffModal
          staff={editingStaff}
          onSave={editingStaff ? handleEditStaff : handleAddStaff}
          onClose={() => {
            setShowAddModal(false)
            setEditingStaff(null)
          }}
        />
      )}
    </AdminLayout>
  )
}

// Staff Modal Component
interface StaffModalProps {
  staff?: Staff | null
  onSave: (staff: any) => void
  onClose: () => void
}

const StaffModal: React.FC<StaffModalProps> = ({ staff, onSave, onClose }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    first_name: staff?.first_name || "",
    last_name: staff?.last_name || "",
    email: staff?.email || "",
    phone_number: staff?.phone_number || "",
    role: staff?.role || "staff",
    is_active: staff?.is_active ?? true,
    password: "",
    permissions: staff?.permissions || [],
  })



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(staff ? { ...staff, ...formData } : formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {staff ? "Edit Staff Member" : "Add New Staff Member"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Staff["role"] })}
                  className="input-field"
                  required
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.is_active ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {staff ? "New Password (leave blank to keep current)" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pr-10"
                  required={!staff} // Only required for new users
                  placeholder={staff ? "Enter new password to change" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Permissions section removed as requested */
            /* staff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {availablePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) */}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="submit" className="flex-1 btn-primary">
                {staff ? "Update Staff" : "Add Staff"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserStaffManagementPage
