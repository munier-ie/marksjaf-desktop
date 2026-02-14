import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone } from 'lucide-react';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, paymentDetails?: string) => void;
  orderData: {
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    customerName?: string;
    tableNumber?: string;
  };
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderData
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    
    setIsConfirming(true);
    try {
      await onConfirm(selectedMethod, paymentDetails);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (!isConfirming) {
      setSelectedMethod('');
      setPaymentDetails('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
          <button
            onClick={handleClose}
            disabled={isConfirming}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Order Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          {orderData.customerName && (
            <p className="text-sm text-gray-600 mb-1">Customer: {orderData.customerName}</p>
          )}
          {orderData.tableNumber && (
            <p className="text-sm text-gray-600 mb-2">Table: {orderData.tableNumber}</p>
          )}
          <div className="space-y-1 mb-2">
            {orderData.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.name} x{item.quantity}</span>
                <span>₦{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 font-semibold">
            <div className="flex justify-between">
              <span>Total:</span>
              <span>₦{orderData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Select Payment Method</h3>
          <div className="space-y-3">
            {/* Cash Payment */}
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={selectedMethod === 'cash'}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="mr-3"
              />
              <Banknote className="w-5 h-5 mr-2 text-green-600" />
              <div>
                <div className="font-medium">Cash</div>
                <div className="text-sm text-gray-500">Direct cash payment</div>
              </div>
            </label>

            {/* Bank Transfer */}
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="transfer"
                checked={selectedMethod === 'transfer'}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="mr-3"
              />
              <Smartphone className="w-5 h-5 mr-2 text-[#9ACD32]" />
              <div>
                <div className="font-medium">Bank Transfer</div>
                <div className="text-sm text-gray-500">Mobile banking or USSD</div>
              </div>
            </label>

            {/* Card Payment */}
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={selectedMethod === 'card'}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="mr-3"
              />
              <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
              <div>
                <div className="font-medium">Card Payment</div>
                <div className="text-sm text-gray-500">Debit/Credit card via POS</div>
              </div>
            </label>
          </div>
        </div>

        {/* Payment Details Input */}
        {(selectedMethod === 'transfer' || selectedMethod === 'card') && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedMethod === 'transfer' ? 'Transaction Reference' : 'Last 4 digits of card'}
            </label>
            <input
              type="text"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder={selectedMethod === 'transfer' ? 'Enter transaction reference' : 'Enter last 4 digits'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={selectedMethod === 'transfer' ? 20 : 4}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMethod || isConfirming}
            className="flex-1 px-4 py-2 bg-[#9ACD32] text-white rounded-md hover:bg-[#8BC34A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;