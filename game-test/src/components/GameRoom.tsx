import React, { useState } from 'react';
import useGameStore from '../utils/gameStore';
import { activities } from './ActivityPalette';
import FoodOrderModal from './FoodOrderModal';

// Room item interface
interface RoomItem {
  id: string;
  name: string;
  position: { top: string; left: string };
  activityId: string;
  icon: string;
  description: string;
}

// Define room items with pastel styling
const roomItems: RoomItem[] = [
  {
    id: 'bed',
    name: 'Bed',
    position: { top: '70%', left: '85%' },
    activityId: 'sleep',
    icon: '🛏️',
    description: 'Sleep to reduce stress and increase energy'
  },
  {
    id: 'desk',
    name: 'Desk & Computer',
    position: { top: '45%', left: '15%' },
    activityId: 'work',
    icon: '💻',
    description: 'Work on your profession to earn money'
  },
  {
    id: 'plant',
    name: 'Flower',
    position: { top: '25%', left: '90%' },
    activityId: 'water_flower',
    icon: '🌱',
    description: 'Care for your plant to reduce stress'
  },
  {
    id: 'tv',
    name: 'TV',
    position: { top: '35%', left: '45%' },
    activityId: 'tv',
    icon: '📺',
    description: 'Watch TV to relax but may lower energy'
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    position: { top: '20%', left: '25%' },
    activityId: 'read',
    icon: '📚',
    description: 'Read books to reduce stress and improve health'
  }
];

const GameRoom: React.FC = () => {
  const { stats, gameTime, applyActivityEffects } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<string>('idle');
  const [showFoodModal, setShowFoodModal] = useState(false);

  // Handle room item click
  const handleItemClick = (item: RoomItem) => {
    // Apply activity effects
    applyActivityEffects(item.activityId);
    
    // Set current activity
    setCurrentActivity(item.activityId);
    
    // Show selection feedback
    setSelectedItem(item.id);
    setTimeout(() => setSelectedItem(null), 1000);
    
    console.log(`Interacted with ${item.name}: ${item.description}`);
  };

  // Format time display
  const formatTime = () => {
    const hour = gameTime.hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div className="h-full w-full relative bg-gradient-to-br from-pink-100 via-blue-50 to-lavender-100 overflow-hidden">
      {/* Room Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-pink-100">
        
        {/* Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-pink-200 to-pink-100 border-t-2 border-pink-300"></div>
        
        {/* Window */}
        <div className="absolute top-10 right-10 w-32 h-24 bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg border-4 border-white shadow-lg">
          <div className="w-full h-full bg-gradient-to-br from-sky-300 to-blue-300 rounded opacity-80"></div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
        </div>

        {/* Wall decorations */}
        <div className="absolute top-16 left-1/3 w-16 h-12 bg-gradient-to-br from-pink-200 to-pink-300 rounded border-2 border-pink-400 shadow-md"></div>
      </div>

      {/* Room Items */}
      {roomItems.map((item) => (
        <div
          key={item.id}
          className={`absolute cursor-pointer transition-all duration-300 transform hover:scale-110 ${
            selectedItem === item.id ? 'scale-125 animate-pulse' : ''
          } ${
            currentActivity === item.activityId ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
          }`}
          style={{ top: item.position.top, left: item.position.left }}
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => setShowTooltip(item.id)}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {/* Item Container */}
          <div className={`relative p-3 rounded-lg shadow-lg transition-all duration-200 ${
            currentActivity === item.activityId 
              ? 'bg-gradient-to-br from-yellow-200 to-yellow-300 border-2 border-yellow-400' 
              : 'bg-gradient-to-br from-white to-pink-50 border-2 border-pink-200 hover:border-pink-300'
          }`}>
            
            {/* Item Icon */}
            <div className="text-3xl mb-1 text-center">
              {item.icon}
            </div>
            
            {/* Item Name */}
            <div className="text-xs font-medium text-center text-gray-700 px-1">
              {item.name}
            </div>

            {/* Activity Indicator */}
            {currentActivity === item.activityId && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-sm"></div>
            )}
          </div>

          {/* Tooltip */}
          {showTooltip === item.id && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
              {item.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          )}
        </div>
      ))}

      {/* Character Avatar */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
        <div className={`relative transition-all duration-500 ${
          currentActivity === 'sleep' ? 'opacity-30' : 'opacity-100'
        }`}>
          {/* Character Shadow */}
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-gray-300 rounded-full opacity-30"></div>
          
          {/* Character Body */}
          <div className="relative">
            {/* Head */}
            <div className="w-12 h-12 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full border-2 border-pink-400 mx-auto mb-1 shadow-md">
              {/* Eyes */}
              <div className="flex justify-center items-center h-full">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="w-8 h-10 bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg border-2 border-blue-400 mx-auto shadow-md"></div>
            
            {/* Arms */}
            <div className="absolute top-4 -left-2 w-4 h-2 bg-gradient-to-r from-pink-200 to-pink-300 rounded border border-pink-400 shadow-sm"></div>
            <div className="absolute top-4 -right-2 w-4 h-2 bg-gradient-to-r from-pink-200 to-pink-300 rounded border border-pink-400 shadow-sm"></div>
          </div>

          {/* Activity Status Bubble */}
          {activities.find(activity => activity.id === currentActivity) && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-white border-2 border-gray-300 rounded-full shadow-lg text-xs font-medium text-gray-700 whitespace-nowrap">
              {activities.find(activity => activity.id === currentActivity)?.name}
            </div>
          )}
        </div>
      </div>

      {/* Stats Display */}
      <div className="absolute top-4 left-4 px-4 py-3 bg-white/90 rounded-lg border-2 border-pink-200 shadow-lg">
        <div className="text-lg font-bold mb-2">Stats</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>Hunger: {stats.hunger.toFixed(0)}</div>
          <div>Stress: {stats.stress.toFixed(0)}</div>
          <div>Energy: {stats.tone.toFixed(0)}</div>
          <div>Health: {stats.health.toFixed(0)}</div>
          <div>Money: ${stats.money.toFixed(0)}</div>
        </div>
      </div>

      {/* Time Display */}
      <div className="absolute top-4 right-4 px-4 py-2 bg-gradient-to-br from-white to-blue-50 rounded-lg border-2 border-blue-200 shadow-lg">
        <div className="text-sm font-medium text-gray-700">Day {gameTime.day}</div>
        <div className="text-lg font-bold text-gray-800">{formatTime()}</div>
      </div>

      {/* Room Ambiance Effects */}
      {currentActivity === 'sleep' && (
        <div className="absolute inset-0 bg-indigo-900 bg-opacity-30 pointer-events-none">
          <div className="absolute top-10 right-20 w-8 h-8 bg-yellow-200 rounded-full opacity-40 animate-pulse"></div>
        </div>
      )}

      {currentActivity === 'work' && (
        <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
      )}

      {currentActivity === 'tv' && (
        <div className="absolute top-1/3 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse"></div>
      )}
      {/* Food Order Button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <button
          onClick={() => setShowFoodModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-orange-300"
        >
          🍕 Order Food
        </button>
      </div>

      {/* Food Order Modal */}
      <FoodOrderModal 
        isOpen={showFoodModal} 
        onClose={() => setShowFoodModal(false)} 
      />
    </div>
  );
};

export default GameRoom;
