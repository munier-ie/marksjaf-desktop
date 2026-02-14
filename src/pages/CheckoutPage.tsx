"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCart } from "../contexts/CartContext"
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import { formatNairaSimple } from "../utils/currency"
import { toast } from 'sonner';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import api from '../services/api';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate()
  const { cart, updateQuantity, removeFromCart, clearCart, getTotalAmount } = useCart()
  const [orderType, setOrderType] = useState<"dine-in" | "takeout">("dine-in")
  const [customerName, setCustomerName] = useState("")
  const [tableNumber, setTableNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Redirect if cart is empty
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some items to your cart before checking out</p>
          <button
            onClick={() => navigate("/pos/order")}
            className="btn-primary"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  // Handle payment confirmation
  const handlePaymentConfirm = async (paymentMethod: string, paymentDetails?: string) => {
    try {
      setIsProcessing(true);

      const orderData = {
        orderType,
        customerName: orderType === "takeout" ? customerName : "",
        tableNumber: orderType === "dine-in" ? tableNumber : "",
        items: cart,
        total: getTotalAmount()
      }

      // Generate a local reference for the order
      const reference = `MA-JAF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Call the local payment confirmation endpoint
      const response = await api.post('/orders/confirm-payment', {
        reference,
        orderData,
        paymentMethod,
        paymentDetails
      });

      if (response.success) {
        // Auto-print receipt
        try {
          toast.info('Printing receipt...');
          const receiptData = {
            businessName: 'MARKSJAF KITCHEN',
            address: 'Shop 1 Modibbo Plaza, Yahaya Guasau\\nSharada, Kano, Nigeria',
            phone: '+234 8032549466',
            email: 'hello@marksjafkitchen.com.ng',
            orderNumber: response.order?.orderNumber || `ORD-${Date.now()}`,
            date: new Date().toISOString(),
            orderType,
            paymentMethod,
            status: 'completed',
            customerName: orderType === "takeout" ? customerName : 'Walk-in Customer',
            tableNumber: orderType === "dine-in" ? tableNumber : undefined,
            items: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity
            })),
            total: getTotalAmount()
          };

          // @ts-ignore - electronAPI is exposed via preload script
          if (window.electronAPI) {
            // @ts-ignore
            window.electronAPI.printReceipt(receiptData);
          }
        } catch (printError) {
          console.error('Auto-print failed:', printError);
          toast.error('Failed to auto-print receipt');
        }

        clearCart();
        toast.success(`${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} payment confirmed successfully!`);
        setShowPaymentModal(false);
        navigate('/pos/history', {
          state: {
            message: 'Order processed successfully!',
            order: response.order
          }
        });
      } else {
        toast.error('Error confirming payment: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Error processing payment confirmation');
    } finally {
      setIsProcessing(false);
    }
  }

  // Handle process order - validate and show payment modal
  const handleProcessOrder = () => {
    // Validate required fields
    if (orderType === "dine-in" && !tableNumber) {
      toast.error('Please enter a table number for dine-in orders');
      return;
    }

    if (orderType === "takeout" && !customerName) {
      toast.error('Please enter customer name for takeout orders');
      return;
    }

    // Show payment confirmation modal
    setShowPaymentModal(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate("/pos/order")} className="mr-4 p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
              <p className="text-gray-600">Review and complete your order</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setOrderType("dine-in")}
              className={`px-4 py-2 rounded-lg font-medium ${orderType === "dine-in" ? "bg-[#9ACD32] text-white" : "bg-gray-200 text-gray-700"
                }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setOrderType("takeout")}
              className={`px-4 py-2 rounded-lg font-medium ${orderType === "takeout" ? "bg-[#9ACD32] text-white" : "bg-gray-200 text-gray-700"
                }`}
            >
              Takeout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <p className="text-sm text-gray-600 currency">{formatNairaSimple(item.price)} each</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-medium currency">{formatNairaSimple(item.price * item.quantity)}</p>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary & Details */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>

              <div className="space-y-4">
                <div>
                  <span className="font-medium text-gray-700">Order Type: </span>
                  <span className="text-[#9ACD32] font-semibold capitalize">{orderType}</span>
                </div>

                {orderType === "dine-in" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Table Number *</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="input-field"
                      placeholder="Enter table number"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="input-field"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                )}
              </div>
            </div>



            {/* Order Summary */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
                  <span className="currency">{formatNairaSimple(getTotalAmount())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service Charge</span>
                  <span className="currency">₦0.00</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-[#9ACD32] currency">{formatNairaSimple(getTotalAmount())}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProcessOrder}
                disabled={isProcessing}
                className="w-full btn-primary h-12 text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Process Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        orderData={{
          total: getTotalAmount(),
          items: cart,
          customerName: orderType === "takeout" ? customerName : undefined,
          tableNumber: orderType === "dine-in" ? tableNumber : undefined
        }}
      />
    </div>
  )
}

export default CheckoutPage