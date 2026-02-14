import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import  apiClient  from '@/lib/api-client';

const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');
        
        if (!reference) {
          navigate('/fail');
          return;
        }
        
        setVerificationStatus('Verifying payment...');
        
        // Call our backend to verify the transaction
        const response = await apiClient.get(`/orders/verify-payment/${reference}`);
        
        if (response.success && response.status === 'success') {
          setVerificationStatus('Payment verified successfully!');
          setTimeout(() => {
            navigate('/success', { 
              state: { 
                orderData: response.order,
                paymentReference: reference 
              }
            });
          }, 2000);
        } else {
          setVerificationStatus('Payment verification failed.');
          setTimeout(() => {
            navigate('/fail', {
              state: {
                error: response.message || 'Payment verification failed',
                reference: reference
              }
            });
          }, 2000);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('Error occurred during verification.');
        setTimeout(() => {
          navigate('/fail', {
            state: {
              error: 'Network error during verification'
            }
          });
        }, 2000);
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyPayment();
  }, [searchParams, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          {isVerifying ? (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#9ACD32] mx-auto"></div>
          ) : (
            <div className="h-16 w-16 mx-auto">
              {/* Status icon based on result */}
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isVerifying ? 'Verifying Payment' : 'Verification Complete'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {verificationStatus}
        </p>
        
        {isVerifying && (
          <p className="text-sm text-gray-500">
            Please wait while we confirm your payment...
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
