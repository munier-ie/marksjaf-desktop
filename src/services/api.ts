// Removed network error handling - app is fully offline

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private getAuthToken() {
    return localStorage.getItem('access_token');
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();

        // Check for token expiration
        if (response.status === 401 && errorData.code === 'TOKEN_EXPIRED') {
          // Clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_user');

          // Trigger logout in AuthContext
          window.dispatchEvent(new CustomEvent('token-expired'));

          // Redirect to appropriate login page based on current route
          const isAdminRoute = window.location.pathname.startsWith('/admin');
          window.location.href = isAdminRoute ? '/admin/login' : '/login';

          throw new Error('Session expired. Please login again.');
        }

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (parseError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    return response.json();
  }

  async get(endpoint: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      // For offline-only app, just throw the error without network handling
      throw error;
    }
  }

  async post(endpoint: string, data?: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined
      });
      return this.handleResponse(response);
    } catch (error) {
      // For offline-only app, just throw the error without network handling
      throw error;
    }
  }

  async put(endpoint: string, data?: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined
      });
      return this.handleResponse(response);
    } catch (error) {
      // For offline-only app, just throw the error without network handling
      throw error;
    }
  }

  async patch(endpoint: string, data?: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined
      });
      return this.handleResponse(response);
    } catch (error) {
      // For offline-only app, just throw the error without network handling
      throw error;
    }
  }

  async delete(endpoint: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      return this.handleResponse(response);
    } catch (error) {
      // For offline-only app, just throw the error without network handling
      throw error;
    }
  }

  // Add upload method for files
  async upload(endpoint: string, formData: FormData) {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData
    });

    return this.handleResponse(response);
  }
}

const api = new ApiService();
export default api;

// User Management API
export const userManagementAPI = {
  // Get all users/staff
  getUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/users?${queryParams}`);
  },

  // Get user by ID
  getUser: async (id: string) => {
    return api.get(`/admin/users/${id}`);
  },

  // Create new user
  createUser: async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    role: string;
    is_active?: boolean;
    password: string;
    permissions?: string[];
  }) => {
    return api.post('/admin/users', userData);
  },

  // Update user
  updateUser: async (id: string, userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    role?: string;
    is_active?: boolean;
    permissions?: string[];
  }) => {
    return api.put(`/admin/users/${id}`, userData);
  },

  // Delete user
  deleteUser: async (id: string) => {
    return api.delete(`/admin/users/${id}`);
  },

  // Get user statistics
  getUserStats: async () => {
    return api.get('/admin/users/stats');
  },
};

// Add to existing api.ts file

// Transactions Management API
export const transactionsAPI = {
  // Get all transactions
  getTransactions: async (params?: {
    status?: string;
    paymentMethod?: string;
    orderType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/transactions?${queryParams}`);
  },

  // Get transaction statistics
  getTransactionStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/transactions/stats?${queryParams}`);
  },

  deleteTransaction: async (transactionId: string) => {
    return api.delete(`/admin/transactions/${transactionId}`);
  },

  cancelTransaction: async (transactionId: string) => {
    return api.put(`/admin/transactions/${transactionId}/cancel`);
  },

  // Export Transactions
  exportTransactions: async (params: {
    format?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentMethod?: string;
    orderType?: string;
    search?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });
    const response = await fetch(`${API_BASE_URL}/api/admin/transactions/export?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    return response.blob();
  }
};

// Bookings API
export const bookingsAPI = {
  // Get all bookings
  getBookings: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/bookings?${queryParams}`);
  },

  // Get booking statistics
  getBookingStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/bookings/stats?${queryParams}`);
  },

  // Create new booking
  createBooking: async (bookingData: {
    user_id?: string;
    consultancy_type: string;
    session_datetime: string;
    description?: string;
    phone_number: string;
    amount: number;
    duration_minutes?: number;
  }) => {
    return api.post('/admin/bookings', bookingData);
  },

  // Update booking
  updateBooking: async (id: string, bookingData: {
    consultancy_type?: string;
    session_datetime?: string;
    description?: string;
    phone_number?: string;
    amount?: number;
    duration_minutes?: number;
  }) => {
    return api.put(`/admin/bookings/${id}`, bookingData);
  },

  // Update booking status
  updateBookingStatus: async (id: string, status: string) => {
    return api.patch(`/admin/bookings/${id}/status`, { status })
  },

  // Delete booking
  deleteBooking: async (id: string) => {
    return api.delete(`/admin/bookings/${id}`);
  },

  // Export Bookings
  exportBookings: async (params: { format?: string; startDate?: string; endDate?: string; status?: string; search?: string } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });

    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/admin/bookings/export?${queryParams}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }
};

// Inventory Management API
// Add to inventoryAPI object
// Add these type definitions at the top of the file
// Update the interface definitions around line 310
interface UploadResponse {
  imageUrl: string;
  filename: string;
  size: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export const inventoryAPI = {
  // Get all items
  getItems: async (params?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/inventory?${queryParams}`);
  },

  // Get item by ID
  getItem: async (id: string) => {
    return api.get(`/admin/inventory/${id}`);
  },

  // Create new item
  createItem: async (itemData: {
    name: string;
    description?: string;
    price: number;
    stock_quantity: number;
    low_stock_threshold?: number;
    category_name?: string;
    type?: string;
    status?: string;
    image_url?: string;
  }) => {
    return api.post('/admin/inventory', itemData);
  },

  // Update item
  updateItem: async (id: string, itemData: {
    name?: string;
    description?: string;
    price?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
    category_name?: string;
    type?: string;
    status?: string;
    image_url?: string;
  }) => {
    return api.put(`/admin/inventory/${id}`, itemData);
  },

  // Delete item
  deleteItem: async (id: string) => {
    return api.delete(`/admin/inventory/${id}`);
  },

  // Get inventory statistics
  getInventoryStats: async () => {
    return api.get('/admin/inventory/stats');
  },

  // Get categories
  getCategories: async () => {
    return api.get('/admin/categories');
  },

  // Create category
  createCategory: async (categoryData: {
    name: string;
    description?: string;
  }) => {
    return api.post('/admin/categories', categoryData);
  },

  // Upload image to local backend
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/inventory/upload-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const data: ApiResponse<UploadResponse> = await response.json()
      return {
        imageUrl: `${API_BASE_URL}${data.data.imageUrl}`,
        filename: data.data.filename,
        size: data.data.size
      }
    } catch (error) {
      // For offline-only app, just log and throw the error
      console.error('Upload error:', error)
      throw error
    }
  },

  // Enhanced inventory management endpoints
  getInventoryMetrics: async () => {
    return api.get('/inventory/stats');
  },

  getCategoryStats: async () => {
    return api.get('/inventory/categories/stats');
  },

  getStockMovements: async (params: { timeRange?: string; category?: string } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/inventory/movements?${queryParams}`);
  },

  getLowStockItems: async () => {
    return api.get('/inventory/low-stock');
  },

  updateStock: async (itemId: string, quantity: number) => {
    return api.patch(`/inventory/${itemId}/stock`, { quantity });
  },

  bulkUpdateItems: async (updates: any[]) => {
    return api.patch('/inventory/bulk-update', { updates });
  },

  exportInventory: async (params: { format?: string; category?: string; status?: string } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    if (params.format === 'csv') {
      const response = await fetch(`${API_BASE_URL}/api/inventory/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.blob();
    }

    return api.get(`/inventory/export?${queryParams}`);
  },

  // Bulk import items
  importItems: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    // Use api.upload or custom fetch since it's a file upload to a specific route
    // api.upload uses /api prefix, so we just pass /admin/inventory/import
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/admin/inventory/import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Import failed');
    }

    return response.json();
  }
};

// Dashboard API - NEW ADDITION
export const dashboardAPI = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    return api.get('/admin/dashboard/stats');
  },

  // Get sales analytics
  getSalesAnalytics: async (params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return api.get(`/admin/dashboard/sales?${queryParams}`);
  },

  // Get inventory status
  getInventoryStatus: async () => {
    return api.get('/admin/dashboard/inventory');
  },

  // Get recent orders (existing endpoint)
  getRecentOrders: async (limit?: number) => {
    const queryParams = limit ? `?limit=${limit}` : '';
    return api.get(`/admin/dashboard/recent-orders${queryParams}`);
  },

  // Export Dashboard Analytics
  exportAnalytics: async (filters: { format: 'xlsx' | 'csv' | 'txt'; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString());
    });

    // Use fetch directly for blob response
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/export?${queryParams}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }
};

export const createCashOrder = async (orderData: any) => {
  try {
    const response = await api.post('/orders/create-cash-order', { orderData });
    return response; // Remove .data since handleResponse already returns parsed JSON
  } catch (error: any) {
    console.error('API Error:', error);
    // Ensure a consistent error response structure
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
};

// Reports and Analytics API
export const reportsAPI = {
  // Get sales report data
  getSalesReport: async (filters: {
    startDate: string;
    endDate: string;
    period: 'daily' | 'weekly' | 'monthly';
    reportType?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/sales?${queryParams}`);
  },

  // Get product performance data
  getProductPerformance: async (filters: {
    startDate: string;
    endDate: string;
    category?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/products?${queryParams}`);
  },

  // Get summary statistics
  getSummaryStats: async (filters: {
    startDate: string;
    endDate: string;
    reportType?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/summary?${queryParams}`);
  },

  // Get customer analytics
  getCustomerAnalytics: async (filters: {
    startDate: string;
    endDate: string;
    period?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/customers?${queryParams}`);
  },

  // Get inventory analytics
  getInventoryAnalytics: async (filters: {
    startDate: string;
    endDate: string;
    category?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/inventory?${queryParams}`);
  },

  // Export report data
  exportReport: async (filters: {
    startDate: string;
    endDate: string;
    reportType: string;
    format: 'csv' | 'pdf';
    period?: string;
    category?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/reports/export?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (filters.format === 'csv') {
      return response.text();
    } else {
      return response.blob();
    }
  },

  // Get financial summary
  getFinancialSummary: async (filters: {
    startDate: string;
    endDate: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/financial?${queryParams}`);
  },

  // Get hourly sales pattern
  getHourlySales: async (filters: {
    startDate: string;
    endDate: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/hourly-sales?${queryParams}`);
  },

  // Get category performance
  getCategoryPerformance: async (filters: {
    startDate: string;
    endDate: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/reports/categories?${queryParams}`);
  }
};
