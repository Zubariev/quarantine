import React, { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from 'utils/gameStore';
import EventPopup, { GameEvent } from './EventPopup';
import { showNotification } from './NotificationManager';

// Example game events
const GAME_EVENTS: GameEvent[] = [
  {
    id: 'friend-call',
    title: 'Friend Calling',
    description: 'Your friend wants to catch up on a video call. They haven\'t talked to you in weeks.',
    image: '/images/events/friend-call.jpg',
    options: [
      {
        label: 'Accept Call',
        effects: {
          stress: -10,
          tone: -5,
          health: 2,
        },
        description: 'You enjoyed catching up, but it took some energy.',
      },
      {
        label: 'Decline Call',
        effects: {
          stress: 5,
          health: -2,
        },
        description: 'You feel a bit guilty, but at least saved energy.',
      },
      {
        label: 'Reschedule for Later',
        effects: {
          stress: 2,
        },
        description: 'You\'ll need to remember to call them back.',
      },
    ],
  },
  {
    id: 'delivery-arrived',
    title: 'Package Delivery',
    description: 'A package you ordered last week has arrived. It\'s waiting downstairs.',
    image: '/images/events/package.jpg',
    options: [
      {
        label: 'Get It Now',
        effects: {
          tone: -5,
          stress: -5, // Excitement of getting a package
        },
        description: 'You got some exercise going downstairs.',
      },
      {
        label: 'Get It Later',
        effects: {
          stress: 2, // Slight anxiety about forgetting it
        },
        description: 'You\'ll pick it up when you have more energy.',
      },
    ],
  },
  {
    id: 'power-outage',
    title: 'Power Outage',
    description: 'Your building is experiencing a temporary power outage. It might last a few hours.',
    image: '/images/events/power-outage.jpg',
    options: [
      {
        label: 'Read a Book',
        effects: {
          stress: -10,
          tone: -5,
        },
        description: 'You enjoy the quiet time with a good book.',
      },
      {
        label: 'Take a Nap',
        effects: {
          tone: 15,
          hunger: -5,
        },
        description: 'The nap was refreshing, but now you\'re hungry.',
      },
      {
        label: 'Call Building Management',
        effects: {
          stress: 10,
          tone: -5,
        },
        description: 'They can\'t do much, and the call was frustrating.',
      },
    ],
  },
  {
    id: 'food-delivery-discount',
    title: 'Food Delivery Discount',
    description: 'Your favorite restaurant is offering 30% off orders today only!',
    image: '/images/events/food-discount.jpg',
    options: [
      {
        label: 'Order Food',
        effects: {
          hunger: 50,
          money: -15,
          stress: -10,
        },
        description: 'The discounted meal was delicious and satisfying.',
      },
      {
        label: 'Save Money',
        effects: {
          stress: 5,
        },
        description: 'You decide to stick to what you have at home.',
      },
    ],
  },
  {
    id: 'noisy-neighbors',
    title: 'Noisy Neighbors',
    description: 'Your neighbors are having a loud party and it\'s disrupting your focus.',
    image: '/images/events/noise.jpg',
    options: [
      {
        label: 'Use Noise-Canceling Headphones',
        effects: {
          stress: -5,
        },
        description: 'You can barely hear them now and can focus again.',
      },
      {
        label: 'Ask Them to Lower the Volume',
        effects: {
          stress: 10,
          tone: -5,
        },
        description: 'The awkward confrontation was draining but worked.',
      },
      {
        label: 'Join the Party',
        effects: {
          stress: -15,
          tone: -20,
          health: -5,
        },
        description: 'You had fun but it drained your energy.',
      },
    ],
  },
];

// Event probability settings
const EVENT_CHECK_INTERVAL = 30000; // Check for possible event every 30 seconds
const EVENT_PROBABILITY = 0.3; // 30% chance of event when check occurs
const MIN_EVENT_SPACING = 120000; // Minimum 2 minutes between events

const EventManager: React.FC = () => {
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number>(0);
  const { gameTime, isGameRunning } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Function to randomly select an event
  const triggerRandomEvent = useCallback(() => {
    const now = Date.now();
    
    // Ensure minimum time has passed since last event
    if (now - lastEventTime < MIN_EVENT_SPACING) {
      return;
    }
    
    // Random chance to trigger event
    if (Math.random() > EVENT_PROBABILITY) {
      return;
    }
    
    // Select random event
    const randomIndex = Math.floor(Math.random() * GAME_EVENTS.length);
    const selectedEvent = GAME_EVENTS[randomIndex];
    
    // Set as current event
    setCurrentEvent(selectedEvent);
    setLastEventTime(now);
    
    // Notify user
    showNotification(`New event: ${selectedEvent.title}`, 'info', 3000);
  }, [lastEventTime]);
  
  // Close event
  const handleCloseEvent = () => {
    setCurrentEvent(null);
  };
  
  // Check for random events at interval
  useEffect(() => {
    if (!isGameRunning) return;
    
    const intervalId = setInterval(() => {
      triggerRandomEvent();
    }, EVENT_CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [isGameRunning, triggerRandomEvent]);
  
  // Additional trigger based on game hour changes
  useEffect(() => {
    // Small chance of event when hour changes
    if (isGameRunning && Math.random() < 0.1) {
      triggerRandomEvent();
    }
  }, [gameTime.hour, isGameRunning, triggerRandomEvent]);
  
  // Expose the trigger method for debug purposes
  useEffect(() => {
    if (containerRef.current) {
      // @ts-ignore - this is for debugging only
      containerRef.current.__triggerEvent = () => {
        // Select random event
        const randomIndex = Math.floor(Math.random() * GAME_EVENTS.length);
        const selectedEvent = GAME_EVENTS[randomIndex];
        
        // Set as current event
        setCurrentEvent(selectedEvent);
        setLastEventTime(Date.now());
        
        // Notify user
        showNotification(`Debug event: ${selectedEvent.title}`, 'info', 3000);
      };
    }
  }, []);
  
  return (
    <div ref={containerRef} data-testid="event-manager">
      <EventPopup event={currentEvent} onClose={handleCloseEvent} />
    </div>
  );
};

export default EventManager; 