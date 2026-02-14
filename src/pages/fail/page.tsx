"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChefHat, XCircle, RefreshCw, MessageCircle, ArrowLeft, AlertTriangle } from "lucide-react"

export default function FailPage() {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = () => {
    setIsRetrying(true)
    // Simulate retry delay
    setTimeout(() => {
      setIsRetrying(false)
      // Redirect back to checkout
      navigate("/checkout")
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
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center justify-center"
          >
            <ChefHat className="h-12 w-12 text-[#9ACD32]" />
            <span className="ml-3 text-3xl font-bold text-gray-900">Marksjaf</span>
          </button>
        </div>

        {/* Error Message */}
        <Card className="border-0 shadow-lg mb-6 bg-red-50 border-l-4 border-l-red-400">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-red-800">Order Failed</h1>
                <p className="text-red-700">We couldn't process your order at this time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Details */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">What happened?</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Payment Processing Error</p>
                  <p className="text-sm text-gray-600">
                    There was an issue processing your payment. This could be due to network connectivity, server
                    issues, or payment gateway problems.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Don't worry!</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• No money has been charged to your account</li>
                <li>• Your cart items are still saved</li>
                <li>• You can try placing the order again</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Try these solutions:</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#9ACD32] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Check your internet connection</p>
                  <p className="text-sm text-gray-600">Make sure you have a stable internet connection</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#9ACD32] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Try again in a few minutes</p>
                  <p className="text-sm text-gray-600">Sometimes server issues resolve themselves quickly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#9ACD32] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Contact our support team</p>
                  <p className="text-sm text-gray-600">We're here to help you complete your order</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-[#9ACD32] hover:bg-[#8BC34A] text-white py-3 text-lg font-semibold"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>

          <Button onClick={handleWhatsAppSupport} className="w-full bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="h-4 w-4 mr-2" />
            Get Help on WhatsApp
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => navigate('/checkout')}
              variant="outline"
              className="w-full border-[#9ACD32] text-[#9ACD32] hover:bg-[#9ACD32] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Checkout
            </Button>
            <Button 
              onClick={() => navigate('/orders')}
              variant="outline" 
              className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              View Previous Orders
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 p-4 bg-[#EFEFEF] rounded-lg">
          <p className="text-sm text-gray-600">
            Need immediate assistance? Call us at{" "}
            <a href="tel:+2341234567890" className="font-medium text-[#9ACD32] hover:underline">
              +234 (0) 123-456-7890
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
