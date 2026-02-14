import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, ChefHat } from 'lucide-react'

const PaymentWaitingPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed'>('waiting')
  const reference = location.state?.reference

  useEffect(() => {
    if (!reference) {
      navigate('/pos/checkout')
      return
    }

    const checkPayment = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/orders/verify/${reference}`)
        const data = await response.json()
        
        if (data.success && data.data.status === 'success') {
          setStatus('success')
          setTimeout(() => {
            navigate('/payment/success', { state: { order: data.order, reference } })
          }, 2000)
        } else if (data.data.status === 'failed') {
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

    // Poll every 3 seconds
    const interval = setInterval(checkPayment, 3000)
    
    // Initial check
    checkPayment()

    return () => clearInterval(interval)
  }, [reference, navigate])

  return (
    <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-6">
          <ChefHat className="h-12 w-12 text-[#9ACD32] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Marksjaf</h1>
        </div>

        {/* Status Content */}
        {status === 'waiting' && (
          <>
            <Loader2 className="h-16 w-16 text-[#9ACD32] mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Payment</h2>
            <p className="text-gray-600 mb-4">
              Please wait while we verify your payment...
            </p>
            <div className="text-sm text-gray-500">
              Reference: {reference}
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-green-800 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">
              Redirecting to order confirmation...
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Payment Failed</h2>
            <p className="text-gray-600">
              Redirecting to retry page...
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentWaitingPage