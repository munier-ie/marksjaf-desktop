import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, XCircle, RefreshCw, MessageCircle, ArrowLeft, AlertTriangle } from "lucide-react"

const PaymentFailedPage: React.FC = () => {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = () => {
    setIsRetrying(true)
    // Simulate retry delay
    setTimeout(() => {
      setIsRetrying(false)
      // Redirect back to checkout
      navigate("/pos/checkout")
    }, 2000)
  }

  const handleWhatsAppSupport = () => {
    const message = `Hi! I'm having trouble completing my order on Marksjaf. Can you please help me?`
    const whatsappUrl = `https://wa.me/2341234567890?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <div className="min-h-screen bg-[#FFFAFA]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center cursor-pointer" onClick={() => navigate('/pos/order')}>
            <ChefHat className="h-12 w-12 text-[#9ACD32]" />
            <span className="ml-3 text-3xl font-bold text-gray-900">Marksjaf</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="bg-white rounded-lg shadow-lg mb-6 border-l-4 border-l-red-400">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-red-800">Payment Failed</h1>
                <p className="text-red-700">We couldn't process your payment at this time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              What went wrong?
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Insufficient funds in your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Network connectivity issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Bank server temporarily unavailable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Card details entered incorrectly</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-[#9ACD32] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#8BC34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRetrying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Try Again
              </>
            )}
          </button>
          
          <button
            onClick={handleWhatsAppSupport}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            Contact Support
          </button>
          
          <button
            onClick={() => navigate('/pos/order')}
            className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentFailedPage