import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from "./contexts/AuthContext"
import LoginPage from "./pages/LoginPage"
import EntryPage from "./pages/EntryPage"
import OrderPage from "./pages/OrderPage"
import OrderHistoryPage from "./pages/OrderHistory"
import DashboardPage from "./pages/DashboardPage"
import AdminLoginPage from "./pages/admin/AdminLoginPage"
import AdminDashboardPage from "./pages/admin/AdminDashboardPage"
import InventoryManagementPage from "./pages/admin/InventoryManagementPage"
import BookingsManagementPage from "./pages/admin/BookingsManagementPage"
import TransactionsHistoryPage from "./pages/admin/TransactionsHistoryPage"
import UserStaffManagementPage from "./pages/admin/UserStaffManagementPage"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminProtectedRoute from "./components/AdminProtectedRoute"
import { CartProvider } from "./contexts/CartContext"
import CheckoutPage from "./pages/CheckoutPage"
import { Toaster } from 'sonner'

// Payment pages
import PaymentWaitingPage from './pages/PaymentWaitingPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PaymentFailedPage from './pages/PaymentFailedPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import PrinterManagementPage from './pages/PrinterManagementPage'
// Add this import
// PaymentGatewayPage removed - no longer needed for local payments

function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      <AuthProvider>
        <CartProvider>
              <div className="min-h-screen max-h-screen overflow-y-auto bg-gray-50 flex flex-col">
                
                <div>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/" element={<Navigate to="/entry" replace />} />

                    {/* POS Routes */}
                    <Route
                      path="/entry"
                      element={
                        <ProtectedRoute>
                          <EntryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pos/order"
                      element={
                        <ProtectedRoute>
                          <OrderPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pos/history"
                      element={
                        <ProtectedRoute>
                          <OrderHistoryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/manage/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/printer/management"
                      element={
                        <ProtectedRoute>
                          <PrinterManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pos/checkout"
                      element={
                        <ProtectedRoute>
                          <CheckoutPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Payment Routes */}
                    <Route
                      path="/payment/waiting"
                      element={
                        <ProtectedRoute>
                          <PaymentWaitingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/payment/callback"
                      element={<PaymentCallbackPage />}
                    />
                    <Route
                      path="/payment/success"
                      element={
                        <ProtectedRoute>
                          <PaymentSuccessPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/payment/failed"
                      element={
                        <ProtectedRoute>
                          <PaymentFailedPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin Management Routes */}
                    <Route
                      path="/admin/dashboard"
                      element={
                        <AdminProtectedRoute>
                          <AdminDashboardPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/inventory"
                      element={
                        <AdminProtectedRoute>
                          <InventoryManagementPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/bookings"
                      element={
                        <AdminProtectedRoute>
                          <BookingsManagementPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/transactions"
                      element={
                        <AdminProtectedRoute>
                          <TransactionsHistoryPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/staff"
                      element={
                        <AdminProtectedRoute>
                          <UserStaffManagementPage />
                        </AdminProtectedRoute>
                      }
                    />
                    
                    {/* Payment Gateway Route - Removed for local payments */}
                  </Routes>
                </div>
              </div>
        </CartProvider>
      </AuthProvider>
    </>
  )
}

export default App
