"use client"

import type React from "react"
import { useState, useEffect } from "react"
import AdminLayout from "../../components/AdminLayout"
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from "lucide-react"
import { formatNairaSimple } from "../../utils/currency"
import { inventoryAPI } from "../../services/api"
import { toast } from 'sonner'
import LocalImageUpload from '../../components/LocalImageUpload'

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  stock_quantity: number
  low_stock_threshold: number
  status: string
  type: string
  image_url?: string
  categories?: {
    id: string
    name: string
  }
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  name: string
  description?: string
}

const InventoryManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreItems, setHasMoreItems] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Reload data when filters change
  useEffect(() => {
    setCurrentPage(1)
    setMenuItems([])
    loadItems(1, true)
  }, [searchTerm, selectedCategory, selectedStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      const [itemsResponse, categoriesResponse, statsResponse] = await Promise.all([
        inventoryAPI.getItems({ page: 1, limit: itemsPerPage }),
        inventoryAPI.getCategories(),
        inventoryAPI.getInventoryStats()
      ])

      setMenuItems(itemsResponse.data || [])
      setCategories(categoriesResponse.data || [])
      setStats(statsResponse.data || stats)
      setTotalItems(itemsResponse.pagination?.total || 0)
      setHasMoreItems((itemsResponse.pagination?.pages || 1) > 1)
      setCurrentPage(1)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async (page = 1, reset = false) => {
    try {
      if (page === 1 && !reset) setLoading(true)
      else setLoadingMore(true)

      const params: any = {
        page,
        limit: itemsPerPage
      }
      if (searchTerm) params.search = searchTerm
      if (selectedCategory !== 'All') params.category = selectedCategory
      if (selectedStatus !== 'all') params.status = selectedStatus

      const response = await inventoryAPI.getItems(params)
      const newItems = response.data || []

      if (reset || page === 1) {
        setMenuItems(newItems)
      } else {
        setMenuItems(prev => [...prev, ...newItems])
      }

      setTotalItems(response.pagination?.total || 0)
      setHasMoreItems(page < (response.pagination?.pages || 1))
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading items:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreItems) {
      loadItems(currentPage + 1)
    }
  }

  const handleAddItem = async (newItem: Omit<MenuItem, "id" | "created_at" | "updated_at">) => {
    try {
      await inventoryAPI.createItem({
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        stock_quantity: newItem.stock_quantity,
        low_stock_threshold: newItem.low_stock_threshold,
        category_name: newItem.categories?.name,
        type: newItem.type,
        status: newItem.status,
        image_url: newItem.image_url || 'null'
      })

      toast.success('Item created successfully!') // Replace alert with toast
      setShowAddModal(false)
      loadData()
    } catch (error) {
      console.error('Error creating item:', error)
      toast.error('Failed to create item') // Replace alert with toast
    }
  }

  const handleEditItem = async (updatedItem: MenuItem) => {
    try {
      await inventoryAPI.updateItem(updatedItem.id, {
        name: updatedItem.name,
        description: updatedItem.description,
        price: updatedItem.price,
        stock_quantity: updatedItem.stock_quantity,
        low_stock_threshold: updatedItem.low_stock_threshold,
        category_name: updatedItem.categories?.name,
        type: updatedItem.type,
        status: updatedItem.status,
        image_url: updatedItem.image_url
      })

      toast.success('Item updated successfully!') // Replace alert with toast
      setEditingItem(null)
      loadData()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item') // Replace alert with toast
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await inventoryAPI.deleteItem(id)
        toast.success('Item deleted successfully!') // Add success toast
        loadData()
      } catch (error) {
        console.error('Error deleting item:', error)
        toast.error('Failed to delete item') // Replace alert with toast
      }
    }
  }

  const getStockStatus = (item: MenuItem) => {
    if (item.stock_quantity === 0) return { status: "Out of Stock", color: "text-red-600 bg-red-100" }
    if (item.stock_quantity <= item.low_stock_threshold) return { status: "Low Stock", color: "text-yellow-600 bg-yellow-100" }
    return { status: "In Stock", color: "text-green-600 bg-green-100" }
  }

  const categoryOptions = ["All", ...categories.map(cat => cat.name)]

  if (loading) {
    return (
      <AdminLayout title="Inventory Management" subtitle="Manage menu items and stock levels">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Inventory Management" subtitle="Manage menu items and stock levels">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <Package className="h-8 w-8 text-[#9ACD32]" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-[#9ACD32] currency">
                {formatNairaSimple(stats.totalValue)}
              </p>
            </div>
            <Package className="h-8 w-8 text-[#9ACD32]" />
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
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center ml-2 whitespace-nowrap">
            <Package className="h-4 w-4 mr-2" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Items Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Image</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Item</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Price</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Stock</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => {
                const stockStatus = getStockStatus(item)
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url.startsWith('http') ? item.image_url : `https://api.marksjafkitchen.com.ng${item.image_url}`}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">
                        {item.categories?.name || 'No Category'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNairaSimple(item.price)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">{item.stock_quantity}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color
                        }`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* No items message */}
          {!loading && menuItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No items found</p>
              {(searchTerm || selectedCategory !== 'All' || selectedStatus !== 'all') && (
                <p className="text-sm">Try adjusting your filters</p>
              )}
            </div>
          )}
        </div>

        {/* Pagination Info and Load More */}
        {!loading && menuItems.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {menuItems.length} of {totalItems} items
              </div>

              {hasMoreItems && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary flex items-center"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <ItemModal
          item={editingItem}
          categories={categories}
          onSave={editingItem ? handleEditItem : handleAddItem}
          onClose={() => {
            setShowAddModal(false)
            setEditingItem(null)
          }}
        />
      )}
    </AdminLayout>
  )
}

// Item Modal Component
interface ItemModalProps {
  item?: MenuItem | null
  categories: Category[]
  onSave: (item: any) => void
  onClose: () => void
}

const ItemModal: React.FC<ItemModalProps> = ({ item, categories, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    price: item?.price || 0,
    stock_quantity: item?.stock_quantity || 0,
    low_stock_threshold: item?.low_stock_threshold || 10,
    category_name: item?.categories?.name || "",
    type: item?.type || "food",
    status: item?.status || "active",
    image_url: item?.image_url || ""
  })

  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }))
  }

  const handleImageRemoved = () => {
    setFormData(prev => ({ ...prev, image_url: "" }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const itemData = {
      ...formData,
      categories: formData.category_name ? { name: formData.category_name } : undefined
    }

    onSave(item ? { ...item, ...itemData } : itemData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {item ? "Edit Menu Item" : "Add New Menu Item"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Image</label>
              <LocalImageUpload
                onImageUploaded={handleImageUploaded}
                currentImageUrl={formData.image_url}
                onImageRemoved={handleImageRemoved}
                className="w-full"
              />
            </div>

            {/* Form fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                className="input-field"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₦)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="food">Food</option>
                  <option value="medicine">Medicine</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                <input
                  type="number"
                  min="0"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="submit" className="flex-1 btn-primary">
                {item ? "Update Item" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default InventoryManagementPage

// Import Modal Component
interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const response = await inventoryAPI.importItems(file);
      setResult(response);
      toast.success('Import completed successfully');
      if (response.success) {
        setTimeout(() => {
          onSuccess(); // Refresh data
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import items');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Import Items</h3>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a CSV file with the following columns: name, price, stock, category, description, image.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Package className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm text-blue-600 font-medium">
                  {file ? file.name : "Click to select CSV file"}
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 btn-primary"
                disabled={!file || uploading}
              >
                {uploading ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
              {result.stats && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Success: {result.stats.success}</p>
                  <p>Failed: {result.stats.failed}</p>
                </div>
              )}
            </div>

            {result.stats?.errors?.length > 0 && (
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded text-xs text-red-600">
                {result.stats.errors.map((err: string, i: number) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}

            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="w-full btn-primary"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
