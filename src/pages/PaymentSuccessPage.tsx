import React, { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ChefHat, CheckCircle, MessageCircle } from "lucide-react"
import { useCart } from "../contexts/CartContext"

const PaymentSuccessPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const [loading, setLoading] = useState(true)

  const reference = location.state?.reference
  const isInIframe = window.self !== window.top

  useEffect(() => {
    // Clear cart since payment was successful
    clearCart()
    
    // Auto-redirect to order history after showing success message briefly
    const timer = setTimeout(() => {
      handleViewOrderHistory()
    }, 3000) // Show success message for 3 seconds

    setLoading(false)
    
    return () => clearTimeout(timer)
  }, [clearCart])

  const handleViewOrderHistory = () => {
    if (isInIframe) {
      // Send message to parent window to navigate to order history
      window.parent.postMessage({
        type: 'NAVIGATE_TO_ORDERS',
        path: '/pos/history'
      }, '*')
    } else {
      // Normal navigation within the same window
      navigate('/pos/history')
    }
  }

  const handleContinueOrdering = () => {
    if (isInIframe) {
      // Send message to parent window to navigate
      window.parent.postMessage({
        type: 'NAVIGATE_TO_ORDERS',
        path: '/pos/order'
      }, '*')
    } else {
      // Normal navigation within the same window
      navigate('/pos/order')
    }
  }

  const handleWhatsAppSupport = () => {
    const message = `Hi! I just completed a payment on Marksjaf. Reference: ${reference}. Thank you!`
    const whatsappUrl = `https://wa.me/2341234567890?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleLogoClick = () => {
    if (isInIframe) {
      window.parent.postMessage({
        type: 'NAVIGATE_TO_ORDERS',
        path: '/pos/order'
      }, '*')
    } else {
      navigate('/pos/order')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9ACD32] mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFAFA]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center cursor-pointer" onClick={handleLogoClick}>
            <ChefHat className="h-12 w-12 text-[#9ACD32]" />
            <span className="ml-3 text-3xl font-bold text-gray-900">Marksjaf</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-lg mb-6 border-l-4 border-l-green-400">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-green-800">Payment Successful!</h1>
                <p className="text-green-700">Your order has been confirmed and is being processed</p>
                {reference && (
                  <p className="text-sm text-gray-600 mt-2">Reference: {reference}</p>
                )}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 text-center">
                🎉 Thank you for your order! You'll be redirected to your order history shortly.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewOrderHistory}
            className="w-full bg-[#9ACD32] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#8BC34A] transition-colors"
          >
            View Order History
          </button>
          
          <button
            onClick={handleContinueOrdering}
            className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Continue Ordering
          </button>
          
          <button
            onClick={handleWhatsAppSupport}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccessPage