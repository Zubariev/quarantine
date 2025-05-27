import React, { useState } from 'react';
import useGameStore from '../utils/gameStore';

interface FoodItem {
  id: string;
  name: string;
  price: number;
  hunger: number;
  health: number;
  stress: number;
  tone: number;
  description: string;
  icon: string;
  category: 'healthy' | 'fast';
}

const foodItems: FoodItem[] = [
  // Healthy Options
  {
    id: 'salad',
    name: 'Fresh Garden Salad',
    price: 15,
    hunger: 25,
    health: 8,
    stress: -2,
    tone: 0,
    description: 'Crisp lettuce, tomatoes, and vegetables with light dressing',
    icon: '🥗',
    category: 'healthy'
  },
  {
    id: 'smoothie',
    name: 'Fruit Smoothie Bowl',
    price: 12,
    hunger: 30,
    health: 6,
    stress: -3,
    tone: 2,
    description: 'Blended fruits with granola and fresh berries',
    icon: '🍓',
    category: 'healthy'
  },
  {
    id: 'grilled_chicken',
    name: 'Grilled Chicken & Quinoa',
    price: 18,
    hunger: 35,
    health: 10,
    stress: -1,
    tone: 1,
    description: 'Lean protein with superfood quinoa and steamed vegetables',
    icon: '🍗',
    category: 'healthy'
  },
  // Fast Food Options
  {
    id: 'burger',
    name: 'Classic Cheeseburger',
    price: 8,
    hunger: 55,
    health: -8,
    stress: -5,
    tone: -3,
    description: 'Juicy beef patty with cheese, lettuce, and special sauce',
    icon: '🍔',
    category: 'fast'
  },
  {
    id: 'pizza',
    name: 'Pepperoni Pizza Slice',
    price: 6,
    hunger: 45,
    health: -6,
    stress: -4,
    tone: -2,
    description: 'Hot cheesy slice with pepperoni and marinara sauce',
    icon: '🍕',
    category: 'fast'
  },
  {
    id: 'fries',
    name: 'Crispy French Fries',
    price: 5,
    hunger: 25,
    health: -10,
    stress: -2,
    tone: -5,
    description: 'Golden crispy fries with sea salt',
    icon: '🍟',
    category: 'fast'
  }
];

interface FoodOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FoodOrderModal: React.FC<FoodOrderModalProps> = ({ isOpen, onClose }) => {
  const { stats, applyStatChanges } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'healthy' | 'fast'>('all');
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = selectedCategory === 'all' 
    ? foodItems 
    : foodItems.filter(item => item.category === selectedCategory);

  const handleOrder = (item: FoodItem) => {
    // Check if player has enough money
    if (stats.money < item.price) {
      setOrderStatus('Not enough money!');
      setTimeout(() => setOrderStatus(null), 2000);
      return;
    }

    // Apply food effects
    const effects = {
      hunger: item.hunger,
      health: item.health,
      stress: item.stress,
      tone: item.tone,
      money: -item.price
    };

    applyStatChanges(effects);
    setOrderStatus(`Ordered ${item.name}! Delivery in progress...`);
    
    // Close modal after successful order
    setTimeout(() => {
      setOrderStatus(null);
      onClose();
    }, 2000);
  };

  const getStatColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-pink-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-4 border-pink-200">
        
        {/* Header */}
        <div className="p-6 border-b-2 border-pink-200 bg-gradient-to-r from-pink-100 to-blue-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">🍽️ Food Delivery</h2>
              <p className="text-sm text-gray-600">Order food to satisfy hunger and affect your stats</p>
              <p className="text-lg font-medium text-green-600 mt-1">💰 ${stats.money}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl font-bold transition-colors"
            >
              ×
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-400 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setSelectedCategory('healthy')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === 'healthy'
                  ? 'bg-green-400 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              🥗 Healthy
            </button>
            <button
              onClick={() => setSelectedCategory('fast')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === 'fast'
                  ? 'bg-red-400 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              🍔 Fast Food
            </button>
          </div>
        </div>

        {/* Order Status */}
        {orderStatus && (
          <div className="mx-6 mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg text-center text-blue-800 font-medium">
            {orderStatus}
          </div>
        )}

        {/* Food Items Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`bg-gradient-to-br from-white to-${item.category === 'healthy' ? 'green' : 'red'}-50 rounded-xl border-2 border-${item.category === 'healthy' ? 'green' : 'red'}-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105`}
            >
              {/* Item Header */}
              <div className="text-center mb-3">
                <div className="text-4xl mb-2">{item.icon}</div>
                <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-3">
                <span className="text-2xl font-bold text-green-600">${item.price}</span>
              </div>

              {/* Stats Effects */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span>🍽️ Hunger:</span>
                  <span className={getStatColor(item.hunger)}>+{item.hunger}</span>
                </div>
                <div className="flex justify-between">
                  <span>❤️ Health:</span>
                  <span className={getStatColor(item.health)}>
                    {item.health > 0 ? '+' : ''}{item.health}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>😰 Stress:</span>
                  <span className={getStatColor(item.stress)}>
                    {item.stress > 0 ? '+' : ''}{item.stress}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>⚡ Energy:</span>
                  <span className={getStatColor(item.tone)}>
                    {item.tone > 0 ? '+' : ''}{item.tone}
                  </span>
                </div>
              </div>

              {/* Order Button */}
              <button
                onClick={() => handleOrder(item)}
                disabled={stats.money < item.price}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  stats.money >= item.price
                    ? `bg-gradient-to-r from-${item.category === 'healthy' ? 'green' : 'red'}-400 to-${item.category === 'healthy' ? 'green' : 'red'}-500 text-white hover:shadow-lg hover:scale-105 active:scale-95`
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {stats.money >= item.price ? 'Order Now 🚚' : 'Not Enough Money'}
              </button>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-gradient-to-r from-blue-100 to-pink-100 text-center text-sm text-gray-600 border-t-2 border-pink-200">
          💡 <strong>Tip:</strong> Healthy food costs more but improves health. Fast food is cheaper but may harm your health.
        </div>
      </div>
    </div>
  );
};

export default FoodOrderModal;
