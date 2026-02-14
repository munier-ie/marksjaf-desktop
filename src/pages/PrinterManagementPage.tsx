"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Printer, RefreshCw, CheckCircle, AlertCircle, Star } from "lucide-react"
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"


interface Receipt {
  id: string
  orderNumber: string
  customerName?: string
  tableNumber?: string
  total: number
  timestamp: Date
  status: 'printed' | 'pending' | 'failed'
}

interface PrinterInfo {
  name: string
  status: 'online' | 'offline'
  isDefault: boolean
  isCustomDefault?: boolean
}

const PrinterManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<'online' | 'offline' | 'testing'>('offline')
  const [connectedPrinters, setConnectedPrinters] = useState<PrinterInfo[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [, setCustomDefaultPrinter] = useState<string | null>(null)

  // Helper function to check if printer name contains "58" (58mm thermal printers)
  const is58mmPrinter = (printerName: string): boolean => {
    return printerName.toLowerCase().includes('58')
  }

  // Detect connected printers using real system APIs
  const detectPrinters = async () => {
    setIsDetecting(true)
    try {
      const detectedPrinters: PrinterInfo[] = []

      // Get custom default printer
      let customDefault: string | null = null
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        customDefault = await (window as any).electronAPI.getDefaultPrinter()
        setCustomDefaultPrinter(customDefault)
      }

      // Use Electron's main process to get system printers
      // Note: getPrinters() now returns only ONLINE printers by default
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const printers = await (window as any).electronAPI.getPrinters()

        console.log('📋 Detected printers:', printers)

        // Find first 58mm printer for auto-selection if no custom default is set
        let auto58mmPrinter: string | null = null

        printers.forEach((printer: any) => {
          const isCustomDefault = printer.name === customDefault

          // Use the isOnline flag from the enhanced detection
          // All printers returned should be online (filtered by backend)
          detectedPrinters.push({
            name: printer.name,
            status: printer.isOnline ? 'online' : 'offline',
            isDefault: printer.isDefault || false,
            isCustomDefault
          })

          // Find first 58mm printer for auto-prioritization
          // Only consider online printers for auto-selection
          if (!auto58mmPrinter && is58mmPrinter(printer.name) && printer.isOnline) {
            auto58mmPrinter = printer.name
          }
        })

        // Auto-select 58mm printer if no custom default is set
        if (!customDefault && auto58mmPrinter) {
          await (window as any).electronAPI.setDefaultPrinter(auto58mmPrinter)
          setCustomDefaultPrinter(auto58mmPrinter)
          // Update the isCustomDefault flag
          detectedPrinters.forEach(p => {
            if (p.name === auto58mmPrinter) {
              p.isCustomDefault = true
            }
          })
          toast.success(`Auto-selected 58mm printer: ${auto58mmPrinter}`)
        }
      } else {
        // Fallback: Try to use Web API if available (limited functionality)
        if ('navigator' in window && 'permissions' in navigator) {
          try {
            // Web API doesn't support printer detection, this is just for completeness
            console.log('Web API printer detection not available - use Electron for full functionality')
          } catch (e) {
            console.log('Web API printer detection not available')
          }
        }
      }

      setConnectedPrinters(detectedPrinters)
      setPrinterStatus(detectedPrinters.some(p => p.status === 'online') ? 'online' : 'offline')

      if (detectedPrinters.length === 0) {
        toast.error('No printers found. Please check if any printers are installed.')
      } else {
        toast.success(`Found ${detectedPrinters.length} printer(s) ready to use`)
      }
    } catch (error) {
      console.error('Error detecting printers:', error)
      toast.error('Failed to detect printers')
      setPrinterStatus('offline')
      setConnectedPrinters([])
    } finally {
      setIsDetecting(false)
    }
  }

  // Handle setting custom default printer
  const handleSetDefaultPrinter = async (printerName: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.setDefaultPrinter(printerName)
        if (result.success) {
          setCustomDefaultPrinter(printerName)
          // Update the UI to reflect new default
          setConnectedPrinters(prev => prev.map(p => ({
            ...p,
            isCustomDefault: p.name === printerName
          })))
          toast.success(`Default printer set to: ${printerName}`)
        } else {
          toast.error('Failed to set default printer')
        }
      }
    } catch (error) {
      console.error('Error setting default printer:', error)
      toast.error('Failed to set default printer')
    }
  }

  // Initial printer detection
  useEffect(() => {
    detectPrinters()
  }, [])

  // Fetch recent orders from backend
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch('/api/orders?limit=5&sort=created_at:desc', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.orders) {
            const receipts: Receipt[] = data.orders.map((order: any) => ({
              id: order.id,
              orderNumber: order.payment_reference || order.id.substring(0, 12).toUpperCase(),
              customerName: order.customer_name || undefined,
              tableNumber: order.table_number || undefined,
              total: order.total_amount,
              timestamp: new Date(order.created_at),
              status: 'printed' as const
            }))
            setRecentReceipts(receipts)
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent orders:', error)
        // Keep empty list on error
        setRecentReceipts([])
      }
    }

    fetchRecentOrders()
  }, [])

  const handleTestPrint = async () => {
    setIsLoading(true)
    setPrinterStatus('testing')

    try {
      // Use the actual receipt service to generate and print a test receipt
      const testReceiptData = {
        order: {
          id: 'TEST-PRINT',
          payment_reference: 'TEST-PRINT',
          total_amount: 0,
          created_at: new Date(),
          order_items: []
        },
        items: [{
          id: 'test',
          name: 'Test Print Item',
          quantity: 1,
          price: 0,
          category: 'Test'
        }],
        customerName: 'Test Customer',
        tableNumber: 'Test Table',
        paymentMethod: 'test',
        paymentDetails: 'Test print',
        reference: 'TEST-PRINT'
      }

      // Get auth token
      const token = localStorage.getItem('access_token')

      // Call the backend to generate and print test receipt
      const response = await fetch('/api/test-print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(testReceiptData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.printed) {
          toast.success('Test receipt printed successfully to thermal printer!')
        } else {
          toast.success('Test receipt generated (check backend console)')
        }
        setPrinterStatus('online')
      } else {
        throw new Error(data.error || 'Print test failed')
      }
    } catch (error) {
      console.error('Test print error:', error)
      toast.error('Test print failed - check printer connection')
      setPrinterStatus('offline')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReprintReceipt = async (receipt: Receipt) => {
    setIsLoading(true)

    try {
      // Get auth token
      const token = localStorage.getItem('access_token')

      // Call backend to reprint the actual receipt
      const response = await fetch(`/api/reprint-receipt/${receipt.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.printed) {
          toast.success(`Receipt ${receipt.orderNumber} reprinted to thermal printer!`)
        } else {
          toast.success(`Receipt ${receipt.orderNumber} generated (check backend console)`)
        }
      } else {
        throw new Error(data.error || 'Reprint failed')
      }
    } catch (error) {
      console.error('Reprint error:', error)
      toast.error('Failed to reprint receipt - check printer connection')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: Receipt['status']) => {
    switch (status) {
      case 'printed':
        return <Badge variant="default" className="bg-[#9ACD32] hover:bg-[#8BC34A]">Printed</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPrinterStatusIcon = () => {
    switch (printerStatus) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-[#9ACD32]" />
      case 'offline':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'testing':
        return <RefreshCw className="h-5 w-5 text-[#9ACD32] animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/entry")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Printer Management</h1>
              <p className="text-gray-600">Manage receipts and printing preferences</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Detect Printers Button */}
            <Button
              variant="outline"
              onClick={detectPrinters}
              disabled={isDetecting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isDetecting ? 'animate-spin' : ''}`} />
              {isDetecting ? 'Detecting...' : 'Detect Printers'}
            </Button>

            {/* Test Print Button */}
            <Button
              onClick={handleTestPrint}
              disabled={isLoading}
              className="bg-[#9ACD32] hover:bg-[#8BC34A] text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Test Print
                </>
              )}
            </Button>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2 pl-3 border-l border-gray-300">
              {getPrinterStatusIcon()}
              <span className="text-sm font-medium capitalize">{printerStatus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Printer Status */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Printer Status
                </CardTitle>
                <CardDescription>
                  Current printer connection and status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection:</span>
                  <div className="flex items-center gap-2">
                    {getPrinterStatusIcon()}
                    <span className="text-sm capitalize">{printerStatus}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Detected:</span>
                  <span className="text-sm text-gray-600">{connectedPrinters.length} printer(s)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm text-gray-600">Terminal Receipt Printer</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Format:</span>
                  <span className="text-sm text-gray-600">48-character width</span>
                </div>

                {connectedPrinters.length > 0 && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Available Printers:</span>
                    <div className="space-y-2">
                      {connectedPrinters.map((printer, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between text-xs p-3 rounded cursor-pointer transition-colors ${printer.isCustomDefault
                            ? 'bg-[#9ACD32]/10 border border-[#9ACD32]/30'
                            : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          onClick={() => handleSetDefaultPrinter(printer.name)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{printer.name}</span>
                              {is58mmPrinter(printer.name) && (
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                  58mm
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {printer.isCustomDefault && (
                              <Star className="h-3 w-3 fill-[#9ACD32] text-[#9ACD32]" />
                            )}
                            {printer.isDefault && !printer.isCustomDefault && (
                              <Badge variant="outline" className="text-[10px]">System</Badge>
                            )}
                            <span className={`text-xs whitespace-nowrap ${printer.status === 'online' ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {printer.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Click a printer to set as default. 58mm printers are prioritized.
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Recent Receipts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Receipts</CardTitle>
                <CardDescription>
                  View and reprint recent order receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto pr-2">
                  <div className="space-y-4">
                    {recentReceipts.map((receipt) => (
                      <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">{receipt.orderNumber}</h3>
                            {getStatusBadge(receipt.status)}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            {receipt.customerName && (
                              <p>Customer: {receipt.customerName}</p>
                            )}
                            {receipt.tableNumber && (
                              <p>Table: {receipt.tableNumber}</p>
                            )}
                            <p>Total: ₦{receipt.total.toLocaleString()}</p>
                            <p>Time: {receipt.timestamp.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReprintReceipt(receipt)}
                            disabled={isLoading}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Reprint
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {recentReceipts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="h-12 w-12 mx-auto mb-3 text-gray-300 flex items-center justify-center">
                        📄
                      </div>
                      <p>No recent receipts found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrinterManagementPage