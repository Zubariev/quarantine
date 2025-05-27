import React, { useState, useEffect } from 'react';
import { useAuthStore } from 'utils/authStore';
import useGameStore from 'utils/gameStore';
import { supabase } from 'utils/supabaseClient';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// Initialize Stripe with publishable key - Use Stripe test key for development
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_PUBLISHABLE_KEY');

// Types for shop items
type ItemCategory = 'course' | 'plant' | 'food' | 'entertainment' | 'furniture' | 'clothing';
type PurchaseType = 'in_game' | 'real_money';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  price: number;
  purchase_type: PurchaseType;
  image_url?: string;
  stats_effects: Record<string, number>;
}

interface InventoryItem {
  item_id: string;
  quantity: number;
  purchased_at: string;
  item_details: ShopItem;
}

// Checkout Form Component
const CheckoutForm = ({ item, onSuccess, onCancel }: { 
  item: ShopItem, 
  onSuccess: () => void, 
  onCancel: () => void 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user, session } = useAuthStore();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      // Call backend to process payment - update the endpoint to use /routes prefix
      const response = await fetch('/routes/shop/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          item_id: item.id,
          quantity: 1,
          payment_method_id: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Payment failed');
      }

      // Handle additional action if needed (3D Secure)
      if (data.status === 'requires_action' && data.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(data.client_secret);
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      toast.success('Payment successful!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      toast.error('Payment failed: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-md shadow-md">
      <h3 className="text-lg font-medium">Purchase {item.name}</h3>
      <p className="text-sm text-gray-500">Price: ${(item.price / 100).toFixed(2)}</p>
      
      <div className="p-3 border rounded">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      {error && (
        <div className="mt-2">
          <ErrorMessage message={error} />
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
        >
          {processing ? (
            <span className="flex items-center">
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </span>
          ) : (
            'Pay Now'
          )}
        </button>
      </div>
    </form>
  );
};

// Shop Item Component
const ShopItemCard = ({ 
  item, 
  onPurchase 
}: { 
  item: ShopItem, 
  onPurchase: (item: ShopItem) => void 
}) => {
  const { stats } = useGameStore();
  
  const formatPrice = (price: number, type: PurchaseType) => {
    return type === 'real_money' 
      ? `$${(price / 100).toFixed(2)}` 
      : `${price} coins`;
  };
  
  // Check if the user can afford the item
  const canAfford = item.purchase_type === 'in_game' ? stats.money >= item.price : true;
  
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
      {item.image_url && (
        <div className="h-40 overflow-hidden">
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
        <p className="text-sm text-gray-500">{item.description}</p>
        
        {Object.entries(item.stats_effects).length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs uppercase font-semibold text-gray-500">Effects:</h4>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {Object.entries(item.stats_effects).map(([stat, value]) => (
                <div key={stat} className="flex items-center text-xs">
                  <span className="capitalize">{stat}:</span>
                  <span className={value > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {value > 0 ? `+${value}` : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="pt-2 flex justify-between items-center">
          <span className="font-medium">
            {formatPrice(item.price, item.purchase_type)}
          </span>
          <button
            onClick={() => onPurchase(item)}
            disabled={!canAfford}
            className={`px-3 py-1 rounded text-sm font-medium ${
              canAfford
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canAfford ? 'Buy' : 'Not enough funds'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Inventory Item Component
const InventoryItemCard = ({ item, onUse }: { item: InventoryItem, onUse: (itemId: string) => void }) => {
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
      {item.item_details.image_url && (
        <div className="h-32 overflow-hidden">
          <img 
            src={item.item_details.image_url} 
            alt={item.item_details.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="text-md font-medium text-gray-900">{item.item_details.name}</h3>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            Qty: {item.quantity}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 line-clamp-2">{item.item_details.description}</p>
        
        {item.quantity > 0 && (
          <button
            onClick={() => onUse(item.item_id)}
            className="w-full mt-2 px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
          >
            Use Item
          </button>
        )}
      </div>
    </div>
  );
};

// Main Shop Page Component
const ShopPage: React.FC = () => {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToPurchase, setItemToPurchase] = useState<ShopItem | null>(null);
  
  const { user, session } = useAuthStore();
  const { stats, applyActivityEffects } = useGameStore();

  // Load shop items and inventory
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch shop items
        const shopResponse = await fetch(`/routes/shop${category ? `?category=${category}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        
        if (!shopResponse.ok) {
          throw new Error('Failed to fetch shop items');
        }
        
        const shopItems = await shopResponse.json();
        setShopItems(shopItems);
        
        // Fetch inventory
        const inventoryResponse = await fetch('/routes/shop/inventory', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        
        if (!inventoryResponse.ok) {
          throw new Error('Failed to fetch inventory');
        }
        
        const inventory = await inventoryResponse.json();
        setInventory(inventory);
      } catch (err: any) {
        console.error('Error fetching shop data:', err);
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, session, category]);

  // Function to handle in-game purchases
  const handleInGamePurchase = async (item: ShopItem) => {
    if (!user) {
      toast.error('You must be logged in to make purchases');
      return;
    }
    
    if (item.purchase_type === 'in_game' && stats.money < item.price) {
      toast.error('Not enough coins to purchase this item');
      return;
    }
    
    try {
      const response = await fetch('/routes/shop/ingame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          item_id: item.id,
          quantity: 1
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Purchase failed');
      }
      
      toast.success(`Successfully purchased ${item.name}!`);
      
      // Refresh inventory and stats after purchase
      const inventoryResponse = await fetch('/routes/shop/inventory', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (inventoryResponse.ok) {
        const inventory = await inventoryResponse.json();
        setInventory(inventory);
      }
      
      // Refresh game stats (handled automatically by game store)
    } catch (err: any) {
      console.error('Purchase error:', err);
      toast.error(err.message || 'Failed to complete purchase');
    }
  };

  // Function to handle real money purchases with Stripe
  const handleRealMoneyPurchase = (item: ShopItem) => {
    setSelectedItem(item);
  };

  // Function to handle "Buy" button click based on item type
  const handlePurchase = (item: ShopItem) => {
    setItemToPurchase(item);
    setShowConfirmation(true);
  };
  
  // Function to confirm purchase
  const confirmPurchase = () => {
    if (!itemToPurchase) return;
    
    setShowConfirmation(false);
    
    if (itemToPurchase.purchase_type === 'in_game') {
      handleInGamePurchase(itemToPurchase);
    } else {
      handleRealMoneyPurchase(itemToPurchase);
    }
    
    setItemToPurchase(null);
  };
  
  // Function to cancel purchase
  const cancelPurchase = () => {
    setShowConfirmation(false);
    setItemToPurchase(null);
  };

  // Function to use an item from inventory
  const handleUseItem = async (itemId: string) => {
    if (!user) {
      toast.error('You must be logged in to use items');
      return;
    }
    
    try {
      const response = await fetch(`/routes/shop/use/${itemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to use item');
      }
      
      const result = await response.json();
      
      toast.success(`Item used successfully!`);
      
      // Update inventory after using item
      const inventoryResponse = await fetch('/routes/shop/inventory', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (inventoryResponse.ok) {
        const inventory = await inventoryResponse.json();
        setInventory(inventory);
      }
      
      // Game stats will be updated automatically via the game store
    } catch (err: any) {
      console.error('Error using item:', err);
      toast.error(err.message || 'Failed to use item');
    }
  };

  // Categories for filtering
  const categories = [
    { id: null, name: 'All' },
    { id: 'course', name: 'Courses' },
    { id: 'plant', name: 'Plants' },
    { id: 'food', name: 'Food' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'clothing', name: 'Clothing' },
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Quarantine Shop</h1>
      
      {/* Tabs for shop and inventory */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'shop'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('shop')}
        >
          Shop
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'inventory'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
      </div>
      
      {/* Money display */}
      <div className="bg-stone-100 p-3 rounded-md mb-6 flex items-center justify-between">
        <span className="font-medium">Current Balance:</span>
        <div className="flex items-center">
          <span className="text-xl font-bold">{stats.money}</span>
          <span className="ml-1 text-stone-500">coins</span>
        </div>
      </div>
      
      {activeTab === 'shop' && (
        <>
          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button
                key={cat.id || 'all'}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  category === cat.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          
          {/* Shop items grid */}
          {loading ? (
            <div className="flex justify-center my-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <ErrorMessage 
              message={error} 
              onRetry={() => {
                setError(null);
                setLoading(true);
                // Re-fetch data
                setCategory(category);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {shopItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                />
              ))}
              {shopItems.length === 0 && (
                <p className="text-gray-500 col-span-full text-center py-12">
                  No items found in this category.
                </p>
              )}
            </div>
          )}
        </>
      )}
      
      {activeTab === 'inventory' && (
        <>
          {/* Inventory grid */}
          {loading ? (
            <div className="flex justify-center my-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <ErrorMessage 
              message={error} 
              onRetry={() => {
                setError(null);
                setLoading(true);
                // Re-fetch data
                setCategory(category);
              }}
            />
          ) : (
            <>
              {inventory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Your inventory is empty.</p>
                  <button
                    onClick={() => setActiveTab('shop')}
                    className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                  >
                    Shop Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {inventory.map((item) => (
                    <InventoryItemCard
                      key={item.item_id}
                      item={item}
                      onUse={handleUseItem}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      
      {/* Purchase confirmation dialog */}
      {showConfirmation && itemToPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-2">Confirm Purchase</h3>
            <p className="mb-4">
              Are you sure you want to purchase {itemToPurchase.name} for{' '}
              {itemToPurchase.purchase_type === 'in_game' 
                ? `${itemToPurchase.price} coins` 
                : `$${(itemToPurchase.price / 100).toFixed(2)}`}?
            </p>
            
            {itemToPurchase.stats_effects && Object.keys(itemToPurchase.stats_effects).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Item Effects:</h4>
                <ul className="text-sm">
                  {Object.entries(itemToPurchase.stats_effects).map(([stat, value]) => (
                    <li key={stat} className="flex justify-between">
                      <span className="capitalize">{stat}:</span>
                      <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
                        {value > 0 ? '+' : ''}{value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelPurchase}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stripe payment modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <Elements stripe={stripePromise}>
              <CheckoutForm
                item={selectedItem}
                onSuccess={() => {
                  setSelectedItem(null);
                  // Refresh inventory after purchase
                  const fetchInventory = async () => {
                    try {
                      const inventoryResponse = await fetch('/routes/shop/inventory', {
                        headers: {
                          'Authorization': `Bearer ${session?.access_token}`
                        }
                      });
                      
                      if (inventoryResponse.ok) {
                        const inventory = await inventoryResponse.json();
                        setInventory(inventory);
                      }
                    } catch (err) {
                      console.error('Error fetching inventory:', err);
                    }
                  };
                  
                  fetchInventory();
                }}
                onCancel={() => setSelectedItem(null)}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage; 