"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useCart } from "../contexts/CartContext"
import { ArrowLeft, Plus, Minus, ShoppingCart, Trash2, Loader2, Search, History } from "lucide-react"
import { formatNairaSimple } from "../utils/currency"
import { toast } from "sonner"

interface MenuItem {
  id: string
  name: string
  price: number
  description: string
  image_url?: string
  status: string
  type: string
  categories?: {
    name: string
  }
}

interface Category {
  id: string
  name: string
}

const OrderPage: React.FC = () => {
  const navigate = useNavigate()
  const { cart, addToCart, updateQuantity, removeFromCart, getTotalAmount, getTotalItems } = useCart()

  // State management
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [orderType, setOrderType] = useState<"dine-in" | "takeout">("dine-in")
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "food" | "medicine">("all")

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/items/categories`)
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        const data = await response.json()
        setCategories([{ id: 'all', name: 'All' }, ...data])
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast.error('Failed to load categories')
        setError('Failed to load categories')
      }
    }

    fetchCategories()
  }, [])

  // Fetch menu items when category or item type filter changes
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (itemTypeFilter !== 'all') {
          params.append('type', itemTypeFilter)
        }
        if (selectedCategory !== 'All') {
          params.append('category', selectedCategory)
        }

        const response = await fetch(`${API_BASE_URL}/api/items?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch menu items')
        }

        const data = await response.json()
        setMenuItems(data)
      } catch (error) {
        console.error('Error fetching menu items:', error)
        toast.error('Failed to load menu items')
        setError('Failed to load menu items')
      } finally {
        setLoading(false)
      }
    }

    fetchMenuItems()
  }, [selectedCategory, itemTypeFilter, API_BASE_URL])

  // Filter items based on selected category, item type, and search term
  const filteredItems = menuItems.filter(item => {
    // Category filter
    const categoryMatch = selectedCategory === "All" || item.categories?.name === selectedCategory

    // Item type filter
    const typeMatch = itemTypeFilter === "all" || item.type === itemTypeFilter

    // Search filter
    const searchMatch = searchTerm === "" ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())

    return categoryMatch && typeMatch && searchMatch
  })

  // Handle adding item to cart
  const handleAddToCart = (item: MenuItem) => {
    if (item.status !== 'active') {
      toast.error('This item is currently unavailable')
      return
    }

    addToCart({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      category: item.categories?.name || 'Uncategorized',
      description: item.description,
    })

    toast.success(`${item.name} added to cart`)
  }

  // Loading state
  if (loading && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#9ACD32]" />
          <p className="text-gray-600">Loading menu items...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Menu Section */}
      <div className="flex-1 p-6 pr-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pr-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/entry")}
              className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => navigate("/pos/history")}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-[#9ACD32] text-white hover:bg-[#8BC34A] flex items-center space-x-2"
            >
              <History className="h-4 w-4" />
              <span>Order History</span>
            </button>
            <button
              onClick={() => setOrderType("dine-in")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${orderType === "dine-in" ? "bg-[#9ACD32] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setOrderType("takeout")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${orderType === "takeout" ? "bg-[#9ACD32] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              Takeout
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="h-[calc(100vh-120px)] overflow-y-auto pr-6">
          {/* Search Input */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9ACD32] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Item Type Filters */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setItemTypeFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${itemTypeFilter === "all"
                  ? "bg-[#9ACD32] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              All Items
            </button>
            <button
              onClick={() => setItemTypeFilter("food")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${itemTypeFilter === "food"
                  ? "bg-[#9ACD32] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              Food
            </button>
            <button
              onClick={() => setItemTypeFilter("medicine")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${itemTypeFilter === "medicine"
                  ? "bg-[#9ACD32] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
            >
              Medicine
            </button>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === category.name
                    ? "bg-[#9ACD32] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Loading indicator for items */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#9ACD32] mr-2" />
              <span className="text-gray-600">Loading items...</span>
            </div>
          )}

          {/* Menu Items Grid - Responsive: 2 columns on desktop, 1 on tablet/mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
            {filteredItems.map((item) => {
              const isAvailable = item.status === 'active'
              return (
                <div
                  key={item.id}
                  className={`card hover:shadow-md transition-all duration-200 overflow-hidden ${!isAvailable ? "opacity-50" : "cursor-pointer hover:scale-105"
                    }`}
                  onClick={() => isAvailable && handleAddToCart(item)}
                >
                  <div className="flex gap-4">
                    {/* Image Section */}
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/80x80/f3f4f6/9ca3af?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-gray-900 mb-1 break-words leading-tight">{item.name}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-words">{item.description}</p>
                          <p className="text-lg font-bold text-[#9ACD32] currency">
                            {formatNairaSimple(Number(item.price))}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {isAvailable ? (
                            <Plus className="h-5 w-5 text-[#9ACD32]" />
                          ) : (
                            <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500 truncate pr-2">
                          {item.categories?.name || 'Uncategorized'}
                        </div>
                        <div className="text-xs text-[#9ACD32] font-medium capitalize flex-shrink-0">
                          {item.type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty state */}
          {!loading && filteredItems.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">
                {searchTerm ? (
                  `No items found matching "${searchTerm}"`
                ) : selectedCategory === 'All' ? (
                  'No menu items available at the moment.'
                ) : (
                  `No items found in ${selectedCategory} category.`
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6 flex flex-col h-full">
          {/* Cart Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-[#9ACD32]" />
              <h2 className="text-xl font-bold text-gray-900">Cart</h2>
            </div>
            {cart.length > 0 && (
              <span className="bg-[#9ACD32] text-white text-sm px-2 py-1 rounded-full">
                {getTotalItems()}
              </span>
            )}
          </div>

          {/* Order Type Display */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg flex-shrink-0">
            <div className="mb-3">
              <span className="font-medium text-gray-700">Order Type: </span>
              <span className="text-[#9ACD32] font-semibold capitalize">{orderType}</span>
            </div>
          </div>

          {/* Cart Items - Fixed Height with Scroll */}
          <div className="flex-1 min-h-0 mb-6">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No items in cart</p>
                <p className="text-sm">Add items from the menu</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-3 pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-600 currency">
                        {formatNairaSimple(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded ml-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total and Checkout - Fixed at Bottom */}
          {cart.length > 0 && (
            <div className="border-t pt-4 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-[#9ACD32] currency">
                  {formatNairaSimple(getTotalAmount())}
                </span>
              </div>

              <button
                onClick={() => navigate("/pos/checkout")}
                disabled={cart.length === 0}
                className="w-full btn-primary h-12 text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Proceed to Checkout ({getTotalItems()})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderPage
