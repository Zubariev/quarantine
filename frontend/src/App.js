import React, { useState, useEffect } from 'react';
import './App.css';

// Define character stats
const initialStats = {
  hunger: 70,
  stress: 20,
  tone: 80,
  health: 90,
  money: 50,
};

// Define activity effects
const activityEffects = {
  work: { hunger: -5, stress: +5, tone: -5, money: +10 },
  sleep: { stress: -8, tone: +10, health: +2 },
  eat_fast: { hunger: +50, stress: -2, tone: -2, health: -10, money: -5 },
  eat_healthy: { hunger: +30, stress: -1, health: +5, money: -15 },
  tv: { hunger: -1, stress: -10, tone: -5 },
  games: { hunger: -1, stress: -15, tone: -10, health: -5 },
  read: { hunger: -1, stress: -8, tone: -5, health: +2 },
  exercise: { hunger: -2, stress: -5, tone: +5, health: +3 },
  meditate: { stress: -10, tone: +2, health: +1 },
  idle: { hunger: -2, stress: +1, tone: -1 },
};

// Activity to sprite mapping
const activitySprites = {
  work: 'tama_comp.png',
  sleep: 'tama_sleep.png',
  eat_fast: 'tama_food.png',
  eat_healthy: 'tama_food.png',
  tv: 'tama_tv.png',
  games: 'tama_comp.png',
  read: 'tama_book.png',
  exercise: 'tama_joga.png',
  meditate: 'tama_joga.png',
  idle: 'tama_sleep.png',
};

// Helper function to clamp values
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// Stats HUD Component
const StatsHud = ({ stats }) => {
  const getBarColor = (value) => {
    if (value < 20) return '#ef4444'; // Red
    if (value < 50) return '#f59e0b'; // Amber
    return '#22c55e'; // Green
  };

  const statsList = [
    { name: 'Health', key: 'health', icon: '❤️' },
    { name: 'Stress', key: 'stress', icon: '🧠' },
    { name: 'Tone', key: 'tone', icon: '⚡' },
    { name: 'Hunger', key: 'hunger', icon: '🍎' },
    { name: 'Money', key: 'money', icon: '💰', isMoney: true },
  ];

  return (
    <div className="stats-hud">
      <div className="stats-container">
        {statsList.map((stat) => {
          const value = stats[stat.key];
          const displayValue = Math.max(0, Math.min(100, value));
          
          return (
            <div key={stat.name} className="stat-item">
              <div className="stat-header">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-label">{stat.name}</span>
                <span className="stat-value">
                  {stat.isMoney ? `$${value}` : `${value}%`}
                </span>
              </div>
              {!stat.isMoney && (
                <div className="stat-bar">
                  <div 
                    className="stat-fill"
                    style={{ 
                      width: `${displayValue}%`,
                      backgroundColor: getBarColor(displayValue)
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Activity Button Component
const ActivityButton = ({ activity, onClick, isActive }) => {
  const activityMap = {
    work: { name: 'Work', icon: '💼' },
    sleep: { name: 'Sleep', icon: '😴' },
    eat_fast: { name: 'Fast Food', icon: '🍔' },
    eat_healthy: { name: 'Healthy Food', icon: '🥗' },
    tv: { name: 'Watch TV', icon: '📺' },
    games: { name: 'Play Games', icon: '🎮' },
    read: { name: 'Read Books', icon: '📚' },
    exercise: { name: 'Exercise', icon: '🏃‍♂️' },
    meditate: { name: 'Meditate', icon: '🧘‍♀️' },
    idle: { name: 'Idle', icon: '😐' },
  };

  const activityInfo = activityMap[activity] || { name: activity, icon: '❓' };

  return (
    <button
      onClick={() => onClick(activity)}
      className={`activity-button ${isActive ? 'active' : ''}`}
    >
      <span className="activity-icon">{activityInfo.icon}</span>
      <span className="activity-name">{activityInfo.name}</span>
    </button>
  );
};

// Enhanced Game Room Component with Sprites
const GameRoom = ({ currentActivity, stats }) => {
  // Activity to position mapping (where the character should be positioned)
  const activityPositions = {
    work: { x: 70, y: 55 }, // Computer desk position
    sleep: { x: 40, y: 70 }, // Bed position
    eat_fast: { x: 65, y: 45 }, // Table/eating area
    eat_healthy: { x: 65, y: 45 }, // Table/eating area
    tv: { x: 20, y: 50 }, // TV position
    games: { x: 70, y: 55 }, // Computer desk position
    read: { x: 15, y: 20 }, // Bookshelf position
    exercise: { x: 50, y: 35 }, // Center of room
    meditate: { x: 50, y: 35 }, // Center of room
    idle: { x: 45, y: 60 }, // Relaxing position
  };

  const currentPosition = activityPositions[currentActivity] || { x: 50, y: 50 };
  const characterSprite = activitySprites[currentActivity] || 'tama_sleep.png';

  return (
    <div className="game-room">
      {/* Room Background */}
      <div className="room-background" />
      
      {/* Room Items */}
      <div className="room-item bookshelf" style={{ left: '5%', top: '10%' }}>
        <img src="/assets/sprites/room/tama_bookshelf.png" alt="Bookshelf" />
      </div>
      
      <div className="room-item bed" style={{ left: '25%', top: '60%' }}>
        <img src="/assets/sprites/room/tama_bed.png" alt="Bed" />
      </div>
      
      <div className="room-item table" style={{ left: '55%', top: '35%' }}>
        <img src="/assets/sprites/room/tama_table.png" alt="Table" />
      </div>

      {/* Window */}
      <div className="room-item window" style={{ right: '10%', top: '10%' }}>
        <div className="window-frame">
          ☀️
          <div className="window-light"></div>
        </div>
      </div>

      {/* TV */}
      <div className="room-item tv-area" style={{ left: '5%', top: '40%' }}>
        <div className="tv-screen">
          📺
          <div className="tv-glow"></div>
        </div>
      </div>

      {/* Character */}
      <div 
        className="character"
        style={{ 
          left: `${currentPosition.x}%`, 
          top: `${currentPosition.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <img 
          src={`/assets/sprites/character/${characterSprite}`} 
          alt="Character" 
          className="character-sprite"
        />
      </div>

      {/* Activity Indicator */}
      <div className="activity-indicator">
        <div className="activity-icon-large">
          {(() => {
            const activityIcons = {
              work: '💼', sleep: '😴', eat_fast: '🍔', eat_healthy: '🥗',
              tv: '📺', games: '🎮', read: '📚', exercise: '🏃‍♂️',
              meditate: '🧘‍♀️', idle: '😐'
            };
            return activityIcons[currentActivity] || '❓';
          })()}
        </div>
        <div className="activity-text">
          {currentActivity.replace('_', ' ').toUpperCase()}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [stats, setStats] = useState(initialStats);
  const [currentActivity, setCurrentActivity] = useState('idle');
  const [gameTime, setGameTime] = useState({ day: 1, hour: 0 });
  const [isGameRunning, setIsGameRunning] = useState(false);

  // Apply activity effects
  const applyActivityEffects = (activityId) => {
    const effects = activityEffects[activityId];
    if (!effects) return;

    setStats(prevStats => {
      const newStats = { ...prevStats };
      Object.entries(effects).forEach(([statName, change]) => {
        if (statName === 'money') {
          newStats[statName] += change;
        } else {
          newStats[statName] = clamp(newStats[statName] + change, 0, 100);
        }
      });
      return newStats;
    });
  };

  // Handle activity selection
  const handleActivitySelect = (activity) => {
    setCurrentActivity(activity);
    applyActivityEffects(activity);
    
    // Add a small visual feedback
    console.log(`🎮 Starting activity: ${activity.replace('_', ' ')}`);
  };

  // Game loop
  useEffect(() => {
    let interval;
    if (isGameRunning) {
      interval = setInterval(() => {
        setGameTime(prevTime => {
          let newHour = prevTime.hour + 1;
          let newDay = prevTime.day;
          
          if (newHour >= 24) {
            newHour = 0;
            newDay += 1;
          }
          
          return { day: newDay, hour: newHour };
        });
        
        // Apply current activity effects
        applyActivityEffects(currentActivity);
      }, 3000); // 3 seconds per game hour
    }
    
    return () => clearInterval(interval);
  }, [isGameRunning, currentActivity]);

  // Start/stop game
  const toggleGame = () => {
    setIsGameRunning(!isGameRunning);
  };

  // Reset game
  const resetGame = () => {
    setStats(initialStats);
    setGameTime({ day: 1, hour: 0 });
    setCurrentActivity('idle');
    setIsGameRunning(false);
  };

  const activities = Object.keys(activityEffects);

  return (
    <div className="app">
      <header className="game-header">
        <h1>🏠 Quarantine - Tamagotchi Style Game</h1>
        <div className="game-controls">
          <button onClick={toggleGame} className={`control-button ${isGameRunning ? 'stop' : 'start'}`}>
            {isGameRunning ? '⏸️ Pause' : '▶️ Start'}
          </button>
          <button onClick={resetGame} className="control-button reset">
            🔄 Reset
          </button>
          <div className="game-time">
            Day {gameTime.day}, Hour {gameTime.hour}:00
          </div>
        </div>
      </header>

      {/* Stats HUD */}
      <StatsHud stats={stats} />

      {/* Main Game Content */}
      <div className="game-content">
        {/* Game Room */}
        <div className="game-room-container">
          <GameRoom currentActivity={currentActivity} stats={stats} />
        </div>

        {/* Activity Sidebar */}
        <div className="activity-sidebar">
          <h3>Activities</h3>
          <div className="activity-grid">
            {activities.map(activity => (
              <ActivityButton
                key={activity}
                activity={activity}
                onClick={handleActivitySelect}
                isActive={currentActivity === activity}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Over Check */}
      {stats.stress >= 100 && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>Game Over!</h2>
            <p>Your stress level reached 100%. You need to take better care of yourself!</p>
            <button onClick={resetGame} className="control-button">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;