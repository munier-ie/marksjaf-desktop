'use client'

import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChefHat, CheckCircle, Clock, MapPin, Phone, MessageCircle, Package } from "lucide-react"
import apiClient from "@/lib/api-client"
import { getToken } from "../../lib/auth-utils"
import { useCart } from "@/contexts/CartContext"  // Add this import

export interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  items: {
    id: string
    name: string
    price: number
  }
}

interface Order {
  id: string
  total_amount: number
  delivery_fee: number
  status: string
  payment_method: string
  created_at: string
  order_items: OrderItem[]
  delivery_addresses: {
    address: string
    city: string
    state: string
  }
}

interface User {
  firstName: string
  lastName: string
  phoneNumber: string
  addresses: Array<{
    street_address: string
    city: string
    state: string
    is_default: boolean
  }>
}

// Add UUID validation function
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export default function SuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = searchParams.get("orderId")
  const { clearCart } = useCart()  // Add this line
  const [orderData, setOrderData] = useState<Order | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrderAndUserData = async () => {
      try {
        const token = getToken()
        if (!token) {
          setError('Authentication required')
          return
        }

        if (!orderId) {
          setError('Order ID not found')
          return
        }

        // Validate UUID format
        if (!isValidUUID(orderId)) {
          setError('Invalid order ID format')
          return
        }

        // Fetch order data and user data in parallel
        const [orderResponse, userResponse] = await Promise.all([
          apiClient.get(`/orders/${orderId}`),
          apiClient.get('/auth/me')
        ])

        if (orderResponse.data.success) {
          setOrderData(orderResponse.data.order)
          // Clear the cart after successful order fetch
          clearCart()
        } else {
          setError('Failed to fetch order details')
        }

        if (userResponse.data.success) {
          setUserData(userResponse.data.data.user)
        } else {
          setError('Failed to fetch user details')
        }

      } catch (error: any) {
        console.error('Error fetching data:', error)
        setError(error.response?.data?.message || 'Failed to load order details')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderAndUserData()
  }, [orderId])

  const handleWhatsAppContact = () => {
    if (!orderData) return
    const message = `Hi! I just placed an order (${orderData.id}) and wanted to confirm the details. Thank you!`
    const whatsappUrl = `https://wa.me/2341234567890?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const getEstimatedDelivery = () => {
    return "25-35 mins" // You can calculate this based on order time or make it dynamic
  }

  const getOrderStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { label: 'Preparing', color: 'bg-yellow-100 text-yellow-800' }
      case 'confirmed':
        return { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' }
      case 'delivered':
        return { label: 'Delivered', color: 'bg-green-100 text-green-800' }
      default:
        return { label: 'Processing', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const getPaymentMethodDisplay = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'Cash Payment'
      case 'transfer':
        return 'Bank Transfer'
      case 'card':
        return 'Card Payment'
      default:
        return method || 'Cash Payment'
    }
  }

  const getPrimaryAddress = () => {
    if (!userData?.addresses?.length) return null
    return userData.addresses.find(addr => addr.is_default) || userData.addresses[0]
  }

  const getSubtotal = () => {
    if (!orderData?.order_items) return 0
    return orderData.order_items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)  // Changed from item.price to item.unit_price
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <Button 
            onClick={() => navigate('/shop')}
            className="bg-[#9ACD32] hover:bg-[#8BC34A] text-white"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  const orderStatus = getOrderStatus(orderData.status)
  const primaryAddress = getPrimaryAddress()
  const customerName = userData ? `${userData.firstName} ${userData.lastName}` : 'Customer'

  return (
    <div className="min-h-screen bg-[#FFFAFA]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center justify-center"
          >
            <ChefHat className="h-12 w-12 text-[#9ACD32]" />
            <span className="ml-3 text-3xl font-bold text-gray-900">Marksjaf</span>
          </button>
        </div>

        {/* Success Message */}
        <Card className="border-0 shadow-lg mb-6 bg-green-50 border-l-4 border-l-green-400">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-green-800">Order Placed Successfully!</h1>
                <p className="text-green-700">Your delicious meal is on its way</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-gray-900">Estimated Delivery</p>
                <p className="text-xs text-gray-600">{getEstimatedDelivery()}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <Package className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-gray-900">Order Status</p>
                <Badge className={`${orderStatus.color} text-xs`}>{orderStatus.label}</Badge>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <Phone className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-gray-900">Payment</p>
                <p className="text-xs text-gray-600">{getPaymentMethodDisplay(orderData.payment_method)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
              <Badge className="bg-[#9ACD32] text-white">{orderData.id}</Badge>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-4">
              {orderData.order_items.map((orderItem, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#EFEFEF] rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{orderItem.items.name}</span>
                    <span className="text-sm text-gray-600 ml-2">x{orderItem.quantity}</span>
                  </div>
                  <span className="font-semibold text-gray-900">₦{(orderItem.unit_price * orderItem.quantity).toLocaleString()}</span>  {/* Changed from orderItem.price to orderItem.unit_price */}
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₦{getSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium">₦{(orderData.delivery_fee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-[#9ACD32]">₦{orderData.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Information</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-[#9ACD32] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Delivery Address</p>
                  <p className="text-sm text-gray-600">
                    {orderData.delivery_addresses ? 
                      `${orderData.delivery_addresses.address}, ${orderData.delivery_addresses.city}, ${orderData.delivery_addresses.state}` :
                      primaryAddress ? 
                        `${primaryAddress.street_address}, ${primaryAddress.city}, ${primaryAddress.state}` :
                        'Address not available'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#9ACD32]" />
                <div>
                  <p className="font-medium text-gray-900">Contact Number</p>
                  <p className="text-sm text-gray-600">{userData?.phoneNumber || 'Phone not available'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#9ACD32]" />
                <div>
                  <p className="font-medium text-gray-900">Customer Name</p>
                  <p className="text-sm text-gray-600">{customerName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button onClick={handleWhatsAppContact} className="w-full bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Us on WhatsApp
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={() => navigate('/orders')}
              className="w-full bg-[#9ACD32] hover:bg-[#8BC34A] text-white"
            >
              View All Orders
            </Button>
            <Button
              onClick={() => navigate('/shop')}
              variant="outline"
              className="w-full border-[#9ACD32] text-[#9ACD32] hover:bg-[#9ACD32] hover:text-white"
            >
              Continue Shopping
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 p-4 bg-[#EFEFEF] rounded-lg">
          <p className="text-sm text-gray-600">
            Thank you for choosing Marksjaf! We'll send you updates about your order via SMS.
          </p>
        </div>
      </div>
    </div>
  )
}
