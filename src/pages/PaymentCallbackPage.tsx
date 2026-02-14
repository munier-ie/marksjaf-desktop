import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ChefHat, Loader2, CheckCircle, XCircle } from "lucide-react"
import { useCart } from "../contexts/CartContext"

const PaymentCallbackPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const { clearCart } = useCart()
  const [hasVerified, setHasVerified] = useState(false)

  useEffect(() => {
    if (hasVerified) return // Prevent multiple calls
    
    const verifyPayment = async () => {
      try {
        setHasVerified(true) // Set flag immediately
        const reference = searchParams.get('reference')
        console.log('Payment reference from URL:', reference)
        
        if (!reference) {
          console.error('No reference found in URL parameters')
          setStatus('failed')
          return
        }
        
        // Use the public verify-callback endpoint instead
        const apiUrl = `${import.meta.env.VITE_API_URL}/api/orders/verify-callback/${reference}`
        console.log('Calling API URL:', apiUrl)
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
            // No Authorization header needed for public endpoint
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Backend verification response:', data)
        
        if (data.success && data.data.status === 'success') {
          console.log('Payment verification successful')
          
          // Clear the cart after successful payment
          clearCart()
          console.log('Cart cleared after successful payment')
          
          setStatus('success')
          setTimeout(() => {
            navigate(`/payment/success?orderId=${data.order.id}`)
          }, 2000)
        } else {
          console.error('Payment verification failed:', data)
          setStatus('failed')
          setTimeout(() => {
            navigate('/payment/failed')
          }, 2000)
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        setStatus('failed')
        setTimeout(() => {
          navigate('/payment/failed')
        }, 2000)
      }
    }

    verifyPayment()
  }, [searchParams, navigate, clearCart, hasVerified]) // Add hasVerified to dependencies

  return (
    <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center">
            <ChefHat className="h-12 w-12 text-[#9ACD32]" />
            <span className="ml-3 text-3xl font-bold text-gray-900">Marksjaf</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-[#9ACD32] mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Order</h1>
              <p className="text-gray-600 mb-4">Please wait while we confirm your payment...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Confirmed!</h1>
              <p className="text-gray-600 mb-4">Redirecting to order details...</p>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
              <p className="text-gray-600 mb-4">Redirecting to error page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentCallbackPage