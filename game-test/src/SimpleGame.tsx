import React, { useState, useEffect } from 'react';

// Game state interfaces
interface Stats {
  hunger: number;
  stress: number;
  tone: number;
  health: number;
  money: number;
}

interface GameTime {
  day: number;
  hour: number;
}

// Room item interface
interface RoomItem {
  id: string;
  name: string;
  position: { top: string; left: string };
  activityId: string;
  icon: string;
  description: string;
}

// Define activities with effects
const activityEffects: { [key: string]: Partial<Stats> } = {
  work:          { hunger: -5, stress: +5, tone: -5, money: +10 },
  sleep:         {            stress: -8, tone: +10, health: +2 },
  eat_fast:      { hunger: +50, stress: -2, tone: -2, health: -10, money: -5 },
  eat_healthy:   { hunger: +30, stress: -1,           health: +5,  money: -15},
  tv:            { hunger: -1, stress: -10, tone: -5 },
  games:         { hunger: -1, stress: -15, tone: -10, health: -5 },
  read:          { hunger: -1, stress: -8, tone: -5,  health: +2 },
  water_flower:  {             stress: -5,           health: +1 },
  exercise:      { hunger: -2, stress: -5, tone: +5,  health: +3 },
  meditate:      {            stress: -10, tone: +2,  health: +1 },
  idle:          { hunger: -2, stress: +1, tone: -1 },
};

// Define room items with positions
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

// Helper function to clamp values
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

// Simple Game component
const SimpleGame: React.FC = () => {
  // Game state
  const [stats, setStats] = useState<Stats>({
    hunger: 70,
    stress: 20,
    tone: 80,
    health: 90,
    money: 50,
  });
  
  const [gameTime, setGameTime] = useState<GameTime>({ day: 1, hour: 0 });
  const [currentActivityId, setCurrentActivityId] = useState<string>('idle');
  const [gameRunning, setGameRunning] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<number>(1000); // 1 second per game hour
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Apply activity effects
  const applyActivityEffects = (activityId: string) => {
    const effects = activityEffects[activityId];
    if (!effects) {
      console.warn(`No effects defined for activity: ${activityId}`);
      return;
    }

    setStats(currentStats => ({
      hunger: clamp((currentStats.hunger || 0) + (effects.hunger || 0), 0, 100),
      stress: clamp((currentStats.stress || 0) + (effects.stress || 0), 0, 100),
      tone: clamp((currentStats.tone || 0) + (effects.tone || 0), 0, 100),
      health: clamp((currentStats.health || 0) + (effects.health || 0), 0, 100),
      money: Math.max(0, (currentStats.money || 0) + (effects.money || 0)),
    }));
  };

  // Handle room item click
  const handleItemClick = (item: RoomItem) => {
    // Set current activity
    setCurrentActivityId(item.activityId);
    
    // Show selection feedback
    setSelectedItem(item.id);
    setTimeout(() => setSelectedItem(null), 1000);
    
    console.log(`Interacted with ${item.name}: ${item.description}`);
  };

  // Start game loop
  const startGameLoop = () => {
    setGameRunning(true);
  };

  // Format time display
  const formatTime = () => {
    const hour = gameTime.hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Game loop
  useEffect(() => {
    if (!gameRunning) return;

    const interval = setInterval(() => {
      // Apply current activity effects
      applyActivityEffects(currentActivityId);
      
      // Advance time
      setGameTime(prevTime => {
        let newHour = prevTime.hour + 1;
        let newDay = prevTime.day;
        
        if (newHour >= 24) {
          newHour = 0;
          newDay += 1;
        }
        
        return { day: newDay, hour: newHour };
      });
    }, gameSpeed);

    return () => clearInterval(interval);
  }, [gameRunning, currentActivityId, gameSpeed]);

  // Check game over conditions
  useEffect(() => {
    if (stats.hunger <= 0 || stats.health <= 0) {
      setGameRunning(false);
      alert(`Game Over! ${stats.hunger <= 0 ? 'You starved!' : 'Your health reached zero!'}`);
    }
  }, [stats]);

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
      </div>

      {/* Room Items */}
      {roomItems.map((item) => (
        <div
          key={item.id}
          className={`absolute cursor-pointer transition-all duration-300 transform hover:scale-110 ${
            selectedItem === item.id ? 'scale-125 animate-pulse' : ''
          } ${
            currentActivityId === item.activityId ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
          }`}
          style={{ top: item.position.top, left: item.position.left }}
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => setShowTooltip(item.id)}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {/* Item Container */}
          <div className={`relative p-3 rounded-lg shadow-lg transition-all duration-200 ${
            currentActivityId === item.activityId 
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
            {currentActivityId === item.activityId && (
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
          currentActivityId === 'sleep' ? 'opacity-30' : 'opacity-100'
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
          </div>

          {/* Activity Status */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-white border-2 border-gray-300 rounded-full shadow-lg text-xs font-medium text-gray-700 whitespace-nowrap">
            {currentActivityId}
          </div>
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

      {/* Game Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {!gameRunning ? (
          <button
            onClick={startGameLoop}
            className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-green-300"
          >
            Start Game
          </button>
        ) : (
          <button
            onClick={() => setGameRunning(false)}
            className="px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-red-300"
          >
            Pause Game
          </button>
        )}
        
        <button
          onClick={() => setGameSpeed(prev => prev === 1000 ? 100 : 1000)}
          className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-blue-300"
        >
          {gameSpeed === 1000 ? 'Speed Up' : 'Slow Down'}
        </button>
      </div>
    </div>
  );
};

export default SimpleGame; 