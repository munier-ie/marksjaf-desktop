import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Filter, DollarSign, Package, ShoppingCart } from 'lucide-react';
import { reportsAPI } from '../services/api';
import { formatNairaSimple } from '../utils/currency';
import { toast } from 'sonner';

interface SalesData {
  date: string;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
}

interface ProductPerformance {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
  category: string;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: 'sales' | 'inventory' | 'customers' | 'products';
  period: 'daily' | 'weekly' | 'monthly';
  category?: string;
}

const ReportsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reportType: 'sales',
    period: 'daily'
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [salesResponse, productsResponse, statsResponse] = await Promise.all([
        reportsAPI.getSalesReport(filters),
        reportsAPI.getProductPerformance(filters),
        reportsAPI.getSummaryStats(filters)
      ]);

      if (salesResponse.success) {
        setSalesData(salesResponse.data || []);
      }
      
      if (productsResponse.success) {
        setProductPerformance(productsResponse.data || []);
      }
      
      if (statsResponse.success) {
        setSummaryStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await reportsAPI.exportReport({ ...filters, format });
      
      if (format === 'csv') {
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${filters.reportType}-${filters.startDate}-to-${filters.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      toast.success(`Report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  // const getChartData = () => {
  //   return salesData.map(item => ({
  //     date: new Date(item.date).toLocaleDateString(),
  //     sales: item.totalSales,
  //     orders: item.orderCount
  //   }));
  // };

  const getTotalRevenue = () => {
    return salesData.reduce((sum, item) => sum + item.totalSales, 0);
  };

  const getTotalOrders = () => {
    return salesData.reduce((sum, item) => sum + item.orderCount, 0);
  };

  const getAverageOrderValue = () => {
    const totalRevenue = getTotalRevenue();
    const totalOrders = getTotalOrders();
    return totalOrders > 0 ? totalRevenue / totalOrders : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportReport('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => handleFilterChange('reportType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sales">Sales Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="products">Product Performance</option>
              <option value="customers">Customer Analytics</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatNairaSimple(getTotalRevenue())}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+12.5%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{getTotalOrders().toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-blue-600 font-medium">+8.2%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatNairaSimple(getAverageOrderValue())}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
              <span className="text-purple-600 font-medium">+3.8%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Products</p>
                <p className="text-2xl font-bold text-gray-900">{productPerformance.length}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Active products</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : salesData.length > 0 ? (
              <div className="space-y-4">
                {salesData.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{new Date(item.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">{item.orderCount} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatNairaSimple(item.totalSales)}</p>
                      <p className="text-sm text-gray-600">Avg: {formatNairaSimple(item.averageOrderValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sales data available for selected period</p>
              </div>
            )}
          </div>
        </div>

        {/* Product Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Products</h3>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : productPerformance.length > 0 ? (
              <div className="space-y-4">
                {productPerformance.slice(0, 10).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatNairaSimple(product.revenue)}</p>
                      <p className="text-sm text-gray-600">{product.totalSold} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No product data available for selected period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Peak Hours</h4>
            <p className="text-sm text-gray-600">Most orders between 12:00 PM - 2:00 PM and 7:00 PM - 9:00 PM</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Popular Categories</h4>
            <p className="text-sm text-gray-600">Traditional Nigerian Meals account for 45% of total sales</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Growth Trend</h4>
            <p className="text-sm text-gray-600">Revenue increased by 15% compared to previous month</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;