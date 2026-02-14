import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, WifiOff, CheckCircle } from 'lucide-react';
import offlineAPI from '../services/offlineAPI';
import { toast } from 'sonner';
import { formatNairaSimple } from '../utils/currency';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
  image_url?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  status: string;
  categories?: {
    name: string;
  };
}

const OfflinePOS: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();

    // App is always offline now
    setIsOffline(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [itemsResponse, categoriesResponse] = await Promise.all([
        offlineAPI.getItems(),
        offlineAPI.getCategories()
      ]);

      if (itemsResponse.success) {
        // Filter out deleted items and only show active items
        const activeItems = (itemsResponse.data || []).filter(
          (item: MenuItem) => item.status === 'active' && !item.status?.includes('deleted')
        );
        setItems(activeItems);
      }

      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data || []);
      }

      // Show offline indicator if using cached data
      if (itemsResponse.offline || categoriesResponse.offline) {
        setIsOffline(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    if (item.stock_quantity <= 0) {
      toast.error('Item is out of stock');
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id);

    if (existingItem) {
      if (existingItem.quantity >= item.stock_quantity) {
        toast.error('Cannot add more items than available in stock');
        return;
      }

      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        stock_quantity: item.stock_quantity,
        image_url: item.image_url
      }]);
    }
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (item && newQuantity > item.stock_quantity) {
      toast.error('Cannot add more items than available in stock');
      return;
    }

    setCart(cart.map(cartItem =>
      cartItem.id === itemId
        ? { ...cartItem, quantity: newQuantity }
        : cartItem
    ));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(cartItem => cartItem.id !== itemId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setProcessingOrder(true);

    try {
      const orderData = {
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: getTotalAmount(),
        payment_method: 'cash',
        order_type: 'pos',
        status: 'completed'
      };

      const response = await offlineAPI.createOrder(orderData);

      if (response.success) {
        // Update local inventory
        const updatedItems = items.map(item => {
          const cartItem = cart.find(c => c.id === item.id);
          if (cartItem) {
            return {
              ...item,
              stock_quantity: Math.max(0, item.stock_quantity - cartItem.quantity)
            };
          }
          return item;
        });

        setItems(updatedItems);

        // Print receipt for the new order
        if (response.order?.id && !response.offline) {
          try {
            const token = localStorage.getItem('access_token');
            const printResponse = await fetch(`/api/reprint-receipt/${response.order.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
              }
            });

            const printData = await printResponse.json();
            if (printData.printed) {
              toast.success('Order completed & receipt printed!');
            } else {
              toast.success('Order processed successfully!');
            }
          } catch (printError) {
            console.error('Receipt print failed:', printError);
            toast.success('Order processed (receipt print failed)');
          }
        } else if (response.offline) {
          toast.success('Order saved offline! Will sync when connection is restored.');
        } else {
          toast.success('Order processed successfully!');
        }

        setCart([]);
      } else {
        toast.error('Failed to process order');
      }
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Failed to process order');
    } finally {
      setProcessingOrder(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categories?.name === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center">
            <WifiOff className="h-5 w-5 text-blue-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Offline POS System
              </p>
              <p className="text-sm text-blue-700">
                All data is stored locally on this device.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-6">
        {/* Menu Items */}
        <div className="flex-1">
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md ${item.stock_quantity <= 0 ? 'opacity-50' : 'cursor-pointer'
                  }`}
                onClick={() => item.stock_quantity > 0 && addToCart(item)}
              >
                {item.image_url && (
                  <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={item.image_url.startsWith('http') ? item.image_url : `https://api.marksjafkitchen.com.ng${item.image_url}`}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 line-clamp-2">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">
                      {formatNairaSimple(item.price)}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded-full ${item.stock_quantity <= 0
                        ? 'bg-red-100 text-red-800'
                        : item.stock_quantity <= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                      {item.stock_quantity <= 0 ? 'Out of Stock' : `${item.stock_quantity} left`}
                    </span>
                  </div>

                  {item.categories && (
                    <span className="text-xs text-gray-500">
                      {item.categories.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No items found</p>
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="w-80 bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            {isOffline && (
              <div className="flex items-center space-x-1 text-blue-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs">Local</span>
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Cart is empty</p>
              <p className="text-sm text-gray-400">Add items to get started</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                      <p className="text-sm text-gray-600">{formatNairaSimple(item.price)} each</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>

                      <span className="w-8 text-center font-medium">{item.quantity}</span>

                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                        disabled={item.quantity >= item.stock_quantity}
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatNairaSimple(getTotalAmount())}
                  </span>
                </div>
              </div>

              {/* Process Order Button */}
              <button
                onClick={processOrder}
                disabled={processingOrder || cart.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Process Order</span>
                  </>
                )}
              </button>


            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflinePOS;