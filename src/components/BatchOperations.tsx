import React, { useState } from 'react';
import { Check, X, Package, Edit3, Trash2, Download } from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { toast } from 'sonner';
import { formatNairaSimple } from '../utils/currency';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  status: string;
  type: string;
  categories?: {
    name: string;
  };
}

interface BatchOperationsProps {
  selectedItems: MenuItem[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

type BatchAction = 'update-stock' | 'update-price' | 'update-status' | 'delete' | 'export';

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedItems,
  onClearSelection,
  onRefresh
}) => {
  const [showModal, setShowModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<BatchAction | null>(null);
  const [batchValue, setBatchValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [operation, setOperation] = useState<'add' | 'set' | 'multiply'>('add');

  const handleBatchAction = (action: BatchAction) => {
    setCurrentAction(action);
    setBatchValue('');
    setOperation('add');
    
    if (action === 'export') {
      handleExport();
      return;
    }
    
    if (action === 'delete') {
      handleBatchDelete();
      return;
    }
    
    setShowModal(true);
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Name', 'Price', 'Stock', 'Threshold', 'Status', 'Type', 'Category'],
        ...selectedItems.map(item => [
          item.name,
          item.price.toString(),
          item.stock_quantity.toString(),
          item.low_stock_threshold.toString(),
          item.status,
          item.type,
          item.categories?.name || 'N/A'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${selectedItems.length} items to CSV`);
    } catch (error) {
      toast.error('Failed to export items');
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} items? This action cannot be undone.`)) {
      return;
    }

    setProcessing(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map(item => inventoryAPI.deleteItem(item.id))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully deleted ${successful} items`);
      }
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} items`);
      }

      onRefresh();
      onClearSelection();
    } catch (error) {
      toast.error('Failed to delete items');
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchUpdate = async () => {
    if (!batchValue || !currentAction) return;

    setProcessing(true);
    try {
      const updates = selectedItems.map(item => {
        const updateData: any = { id: item.id };
        
        switch (currentAction) {
          case 'update-stock':
            const currentStock = item.stock_quantity;
            const value = parseFloat(batchValue);
            
            switch (operation) {
              case 'add':
                updateData.stock_quantity = Math.max(0, currentStock + value);
                break;
              case 'set':
                updateData.stock_quantity = Math.max(0, value);
                break;
              case 'multiply':
                updateData.stock_quantity = Math.max(0, Math.round(currentStock * value));
                break;
            }
            break;
            
          case 'update-price':
            const currentPrice = item.price;
            const priceValue = parseFloat(batchValue);
            
            switch (operation) {
              case 'add':
                updateData.price = Math.max(0, currentPrice + priceValue);
                break;
              case 'set':
                updateData.price = Math.max(0, priceValue);
                break;
              case 'multiply':
                updateData.price = Math.max(0, currentPrice * priceValue);
                break;
            }
            break;
            
          case 'update-status':
            updateData.status = batchValue;
            break;
        }
        
        return updateData;
      });

      const results = await Promise.allSettled(
        updates.map(update => inventoryAPI.updateItem(update.id, update))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully updated ${successful} items`);
      }
      if (failed > 0) {
        toast.error(`Failed to update ${failed} items`);
      }

      onRefresh();
      onClearSelection();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to update items');
    } finally {
      setProcessing(false);
    }
  };

  const getActionTitle = () => {
    switch (currentAction) {
      case 'update-stock': return 'Update Stock Quantity';
      case 'update-price': return 'Update Price';
      case 'update-status': return 'Update Status';
      default: return 'Batch Operation';
    }
  };

  const getActionDescription = () => {
    switch (currentAction) {
      case 'update-stock': return 'Modify stock quantities for selected items';
      case 'update-price': return 'Modify prices for selected items';
      case 'update-status': return 'Change status for selected items';
      default: return '';
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="text-sm text-blue-700">
              Total value: {formatNairaSimple(selectedItems.reduce((sum, item) => sum + (item.price * item.stock_quantity), 0))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Batch action buttons */}
            <button
              onClick={() => handleBatchAction('update-stock')}
              className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm flex items-center space-x-1"
            >
              <Package className="h-4 w-4" />
              <span>Stock</span>
            </button>
            
            <button
              onClick={() => handleBatchAction('update-price')}
              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors text-sm flex items-center space-x-1"
            >
              <Edit3 className="h-4 w-4" />
              <span>Price</span>
            </button>
            
            <button
              onClick={() => handleBatchAction('update-status')}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-sm flex items-center space-x-1"
            >
              <Edit3 className="h-4 w-4" />
              <span>Status</span>
            </button>
            
            <button
              onClick={() => handleBatchAction('export')}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            
            <button
              onClick={() => handleBatchAction('delete')}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm flex items-center space-x-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
            
            <button
              onClick={onClearSelection}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Batch Operation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{getActionTitle()}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{getActionDescription()}</p>
            
            <div className="space-y-4">
              {currentAction !== 'update-status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operation</label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'add', label: 'Add to current' },
                      { value: 'set', label: 'Set to value' },
                      { value: 'multiply', label: 'Multiply by' }
                    ].map(op => (
                      <button
                        key={op.value}
                        onClick={() => setOperation(op.value as any)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          operation === op.value
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentAction === 'update-status' ? 'Status' : 'Value'}
                </label>
                {currentAction === 'update-status' ? (
                  <select
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${currentAction === 'update-price' ? 'price' : 'quantity'}`}
                    step={currentAction === 'update-price' ? '0.01' : '1'}
                    min="0"
                  />
                )}
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Preview:</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedItems.length} items will be updated
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchUpdate}
                disabled={!batchValue || processing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Updating...' : 'Update Items'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchOperations;