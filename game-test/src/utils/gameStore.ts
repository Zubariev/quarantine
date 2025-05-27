import { create } from 'zustand';

// Mock ActivityPalette activities 
const activities = [
  { id: 'work', name: 'Work', icon: '💻', color: 'bg-blue-500' },
  { id: 'sleep', name: 'Sleep', icon: '🛏️', color: 'bg-indigo-500' },
  { id: 'eat_fast', name: 'Fast Food', icon: '🍔', color: 'bg-red-500' },
  { id: 'eat_healthy', name: 'Healthy Food', icon: '🥗', color: 'bg-green-500' },
  { id: 'tv', name: 'Watch TV', icon: '📺', color: 'bg-purple-500' },
  { id: 'games', name: 'Play Games', icon: '🎮', color: 'bg-pink-500' },
  { id: 'read', name: 'Read', icon: '📚', color: 'bg-yellow-500' },
  { id: 'water_flower', name: 'Water Plant', icon: '🌱', color: 'bg-green-400' },
  { id: 'exercise', name: 'Exercise', icon: '🏋️‍♂️', color: 'bg-orange-500' },
  { id: 'meditate', name: 'Meditate', icon: '🧘', color: 'bg-teal-500' },
];

// Mock session with user
const mockSession = {
  user: { id: 'mock-user-id' }
};

// Mock supabase client with simplified implementation
const supabase = {
  auth: {
    getSession: () => mockSession,
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  }),
};

// LocalStorage keys
const STATS_STORAGE_KEY = 'gameStats';
const GAME_TIME_STORAGE_KEY = 'gameTime';
const DAILY_SCHEDULE_STORAGE_KEY = 'dailySchedule';

// Activity effects (stat changes per hour)
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

// Helper function to clamp values
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

// Types for game state
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

interface AudioSettings {
  bgmVolume: number;
  sfxVolume: number;
  isMuted: boolean;
}

interface GameState {
  stats: Stats;
  gameTime: GameTime;
  isLoading: boolean;
  isGameRunning: boolean;
  isGameOver: boolean;
  gameOverReason: string;
  dailySchedule: { activityId: string | null }[];
  audioSettings: AudioSettings;
}

interface GameActions {
  initializeGame: (userId?: string) => Promise<void>;
  startGame: () => void;
  pauseGame: () => void;
  resetGame: () => void;
  applyActivityEffects: (activityId: string) => void;
  advanceTime: () => void;
  setSchedule: (newSchedule: { activityId: string | null }[]) => void;
  applyStatChanges: (changes: Partial<Stats>) => void;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  saveGameState: () => void;
}

// Initial stats
const initialStats: Stats = {
  hunger: 70,
  stress: 20,
  tone: 80,
  health: 90,
  money: 50,
};

// Helper functions to load from localStorage
const loadStatsFromLocalStorage = (): Stats | null => {
  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Error loading stats from localStorage:", e);
    return null;
  }
};

const loadGameTimeFromLocalStorage = (): GameTime | null => {
  try {
    const saved = localStorage.getItem(GAME_TIME_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Error loading game time from localStorage:", e);
    return null;
  }
};

const loadDailyScheduleFromLocalStorage = (): { activityId: string | null }[] | null => {
  try {
    const saved = localStorage.getItem(DAILY_SCHEDULE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error("Error loading daily schedule from localStorage:", e);
    return null;
  }
};

// Create the Zustand store
const useGameStore = create<GameState & GameActions>((set, get) => ({
  // Initial State - tried to load from localStorage or fallback to defaults
  stats: loadStatsFromLocalStorage() || initialStats,
  gameTime: loadGameTimeFromLocalStorage() || { day: 1, hour: 0 },
  isLoading: false,
  isGameRunning: false,
  isGameOver: false,
  gameOverReason: '',
  dailySchedule: loadDailyScheduleFromLocalStorage() || Array(24).fill({ activityId: null }),
  audioSettings: {
    bgmVolume: 0.5,
    sfxVolume: 0.5,
    isMuted: false,
  },

  // Save game state to local storage and backend if user is authenticated
  saveGameState: () => {
    const { stats, gameTime, dailySchedule } = get();
    
    try {
      // Save to localStorage
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
      localStorage.setItem(GAME_TIME_STORAGE_KEY, JSON.stringify(gameTime));
      localStorage.setItem(DAILY_SCHEDULE_STORAGE_KEY, JSON.stringify(dailySchedule));
      
      // In a real app, we would save to backend here
      console.log("Game state saved to localStorage");
    } catch (e) {
      console.error("Error saving game state:", e);
    }
  },

  // --- Stat Update Logic ---
  applyActivityEffects: (activityId) => {
    const effects = activityEffects[activityId];
    if (!effects) {
      console.warn(`No effects defined for activity: ${activityId}`);
      return;
    }

    set((state) => {
      const currentStats = state.stats;
      const newStats: Stats = {
        hunger: clamp((currentStats.hunger || 0) + (effects.hunger || 0), 0, 100),
        stress: clamp((currentStats.stress || 0) + (effects.stress || 0), 0, 100),
        tone: clamp((currentStats.tone || 0) + (effects.tone || 0), 0, 100),
        health: clamp((currentStats.health || 0) + (effects.health || 0), 0, 100),
        money: Math.max(0, (currentStats.money || 0) + (effects.money || 0)),
      };

      // Check for game over conditions
      let isGameOver = false;
      let gameOverReason = '';

      if (newStats.health <= 0) {
        isGameOver = true;
        gameOverReason = 'Your health reached zero. Game over!';
      } else if (newStats.hunger <= 0) {
        isGameOver = true;
        gameOverReason = 'You starved to death. Game over!';
      }

      return { 
        stats: newStats,
        isGameOver,
        gameOverReason
      };
    });

    // Save state after applying effects
    get().saveGameState();
  },

  // --- Game Initialization ---
  initializeGame: async (userId) => {
    if (!userId) {
      console.log("Initializing game without user ID");
      
      set({ 
        stats: initialStats,
        gameTime: { day: 1, hour: 0 },
        dailySchedule: Array(24).fill({ activityId: null }),
        isLoading: false,
        isGameRunning: false,
        isGameOver: false,
        gameOverReason: ''
      });
      return;
    }

    set({ isLoading: true });

    try {
      // In a real app, this would load data from the backend
      console.log("Initializing game for user:", userId);
      
      // Use default values or load from localStorage
      set({ 
        stats: loadStatsFromLocalStorage() || initialStats,
        gameTime: loadGameTimeFromLocalStorage() || { day: 1, hour: 0 },
        dailySchedule: loadDailyScheduleFromLocalStorage() || Array(24).fill({ activityId: null }),
        isLoading: false
      });
    } catch (e) {
      console.error("Error initializing game:", e);
      set({ 
        stats: initialStats,
        gameTime: { day: 1, hour: 0 },
        dailySchedule: Array(24).fill({ activityId: null }),
        isLoading: false
      });
    }
  },

  // Game flow controls
  startGame: () => {
    set({ isGameRunning: true });
  },
  
  pauseGame: () => {
    set({ isGameRunning: false });
  },
  
  // Time management
  advanceTime: () => {
    set(state => {
      let newHour = state.gameTime.hour + 1;
      let newDay = state.gameTime.day;
      
      if (newHour >= 24) {
        newHour = 0;
        newDay += 1;
      }
      
      return { gameTime: { day: newDay, hour: newHour } };
    });
    
    // Apply scheduled activity for the current hour if any
    const { gameTime, dailySchedule } = get();
    const currentHour = gameTime.hour;
    const scheduledActivity = dailySchedule[currentHour]?.activityId;
    
    if (scheduledActivity) {
      get().applyActivityEffects(scheduledActivity);
    } else {
      // Apply idle effects if no activity is scheduled
      get().applyActivityEffects('idle');
    }
    
    // Save state after time advancement
    get().saveGameState();
  },

  // Allow external components to update the schedule
  setSchedule: (newSchedule) => {
    set({ dailySchedule: newSchedule });
    
    // Save the updated schedule
    try {
      localStorage.setItem(DAILY_SCHEDULE_STORAGE_KEY, JSON.stringify(newSchedule));
      console.log("Schedule saved to localStorage");
    } catch (e) {
      console.error("Error saving schedule:", e);
    }
  },

  // Reset the game to initial state
  resetGame: () => {
    // Reset game state
    set({
      stats: initialStats,
      gameTime: { day: 1, hour: 0 },
      dailySchedule: Array(24).fill({ activityId: null }),
      isGameRunning: false,
      isGameOver: false,
      gameOverReason: ''
    });
    
    // Save the reset state to localStorage
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(initialStats));
      localStorage.setItem(GAME_TIME_STORAGE_KEY, JSON.stringify({ day: 1, hour: 0 }));
      localStorage.setItem(DAILY_SCHEDULE_STORAGE_KEY, JSON.stringify(Array(24).fill({ activityId: null })));
      console.log("Game reset state saved to localStorage");
    } catch (e) {
      console.error("Error saving reset state:", e);
    }
  },

  // Add methods for applying stat changes from events
  applyStatChanges: (changes) => {
    set((state) => {
      const currentStats = state.stats;
      const newStats: Stats = { ...currentStats };
      
      // Apply each change, respecting the limits
      if (changes.hunger !== undefined) {
        newStats.hunger = clamp(currentStats.hunger + changes.hunger, 0, 100);
      }
      
      if (changes.stress !== undefined) {
        newStats.stress = clamp(currentStats.stress + changes.stress, 0, 100);
      }
      
      if (changes.tone !== undefined) {
        newStats.tone = clamp(currentStats.tone + changes.tone, 0, 100);
      }
      
      if (changes.health !== undefined) {
        newStats.health = clamp(currentStats.health + changes.health, 0, 100);
      }
      
      if (changes.money !== undefined) {
        newStats.money = Math.max(0, currentStats.money + changes.money);
      }
      
      // Check for game over conditions
      let isGameOver = false;
      let gameOverReason = '';

      if (newStats.health <= 0) {
        isGameOver = true;
        gameOverReason = 'Your health reached zero. Game over!';
      } else if (newStats.hunger <= 0) {
        isGameOver = true;
        gameOverReason = 'You starved to death. Game over!';
      }

      return { 
        stats: newStats,
        isGameOver,
        gameOverReason
      };
    });
    
    // Save state after applying event changes
    get().saveGameState();
  },
  
  // Update audio settings
  updateAudioSettings: (settings) => {
    set((state) => ({
      audioSettings: {
        ...state.audioSettings,
        ...settings,
      }
    }));
  }
}));

export default useGameStore;
export { activities };
