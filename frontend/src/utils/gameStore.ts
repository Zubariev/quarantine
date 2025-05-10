// Define stat changes per hour for each activity\n// Based on user requirements doc\nconst activityEffects: { \n  [key: string]: Partial<Stats> \n} = {\n  work:          { hunger: -5, stress: +5, tone: -5, money: +10 },\n  sleep:         {            stress: -8, tone: +10, health: +2 },\n  eat_fast:      { hunger: +50, stress: -2, tone: -2, health: -10, money: -5 }, // Assuming this is \'Order Fast Food\'\n  eat_healthy:   { hunger: +30, stress: -1,           health: +5,  money: -15}, // Assuming this is \'Order Healthy Meal\'\n  tv:            { hunger: -1, stress: -10, tone: -5 }, // Assuming this is \'Watch TV / Stream\'\n  games:         { hunger: -1, stress: -15, tone: -10, health: -5 }, // Assuming this is \'Play Computer Games\'\n  read:          { hunger: -1, stress: -8, tone: -5,  health: +2 }, // Assuming this is \'Read Books\'\n  // water_flower: {             stress: -5,           health: +1 }, // Name mismatch, skipping for now - User prompt used \'Water & Trim Flower\'\n  exercise:      { hunger: -2, stress: -5, tone: +5,  health: +3 }, // Assuming this is \'Exercise (In-room)\'\n  meditate:      {            stress: -10, tone: +2,  health: +1 }, // Assuming this is \'Meditation\'\n  idle:          { hunger: -2, stress: +1, tone: -1 }, // Default penalty for doing nothing?\ Added placeholder effect.\n};\n\n// Helper function to clamp values within a range\nconst clamp = (value: number, min: number, max: number): number => {\n  return Math.max(min, Math.min(value, max));\n};\n\n
import { create } from 'zustand';
import { supabase } from 'utils/supabaseClient'; // Import supabase
import { Session, User } from '@supabase/supabase-js'; // Import types
import { activities } from 'components/ActivityPalette'; // Use defined activities

// LocalStorage keys
const STATS_STORAGE_KEY = 'gameStats';
const SCHEDULE_STORAGE_KEY = 'userSchedule';
const GAME_TIME_STORAGE_KEY = 'gameTime';

// Define the structure for character stats
interface Stats {
  hunger: number; // 0-100
  stress: number; // 0-100
  tone: number;   // Energy 0-100
  health: number; // 0-100
  money: number;
}

// Define audio settings structure
interface AudioSettings {
  muted: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

// Define the structure for the game's state
interface GameState {
  stats: Stats;
  gameTime: {
    day: number;
    hour: number; // 0-23
  };
  currentActivityId: string; // ID of the activity currently being performed
  dailySchedule: Array<{ activityId: string | null }>; // The 24-hour schedule
  isGameRunning: boolean; // To control the game loop
  gameSpeed: number; // Milliseconds per game *hour* (adjust later for minutes)
  isLoading: boolean; // For initial loading
  intervalId: number | null; // To store the interval ID for clearing
  isGameOver: boolean; // Flag for game over state
  gameOverReason: string | null; // Reason for game over
  audioSettings: AudioSettings; // Audio settings
}

// Define actions that can be performed on the state
interface GameActions {
  initializeGame: (userId: string) => Promise<void>; // New init action
  startGameLoop: () => void;
  pauseGameLoop: () => void;
  applyActivityEffects: (activityId: string) => void; // Action to apply effects
  applyStatChanges: (changes: Partial<Stats>) => void; // Apply stat changes from events
  setSchedule: (newSchedule: Array<{ activityId: string | null }>) => void; // Allow external schedule updates
  resetGame: () => void; // Resets to initial state
  saveGameState: () => void; // Save game state to localStorage and backend
  updateAudioSettings: (settings: Partial<AudioSettings>) => void; // Update audio settings
}

// Define initial values
const initialStats: Stats = {
  hunger: 70,
  stress: 20,
  tone: 80,
  health: 90,
  money: 50,
};

const initialSchedule: Array<{ activityId: string | null }> = Array(24)
  .fill(null)
  .map(() => ({ activityId: 'idle' }));

// Helper function to load schedule from localStorage
const loadScheduleFromLocalStorage = (): Array<{ activityId: string | null }> | null => {
  try {
    const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (saved) {
      const parsedSchedule = JSON.parse(saved);
      if (Array.isArray(parsedSchedule) && 
          parsedSchedule.length === 24 && 
          parsedSchedule.every((slot: any) => typeof slot === 'object' && slot !== null && 'activityId' in slot)) {
        console.log("Game store: Loaded schedule from localStorage");
        return parsedSchedule;
      }
    }
  } catch (err) {
    console.error("Game store: Failed to load schedule from localStorage:", err);
  }
  return null;
};

// Helper function to load stats from localStorage
const loadStatsFromLocalStorage = (): Stats | null => {
  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    if (saved) {
      const parsedStats = JSON.parse(saved);
      // Basic validation to ensure it has all required fields
      if (typeof parsedStats === 'object' && 
          parsedStats !== null &&
          'hunger' in parsedStats &&
          'stress' in parsedStats &&
          'tone' in parsedStats &&
          'health' in parsedStats &&
          'money' in parsedStats) {
        console.log("Game store: Loaded stats from localStorage");
        return parsedStats as Stats;
      }
    }
  } catch (err) {
    console.error("Game store: Failed to load stats from localStorage:", err);
  }
  return null;
};

// Helper function to load game time from localStorage
const loadGameTimeFromLocalStorage = (): { day: number; hour: number } | null => {
  try {
    const saved = localStorage.getItem(GAME_TIME_STORAGE_KEY);
    if (saved) {
      const parsedTime = JSON.parse(saved);
      if (typeof parsedTime === 'object' && 
          parsedTime !== null &&
          'day' in parsedTime &&
          'hour' in parsedTime) {
        console.log("Game store: Loaded game time from localStorage");
        return parsedTime as { day: number; hour: number };
      }
    }
  } catch (err) {
    console.error("Game store: Failed to load game time from localStorage:", err);
  }
  return null;
};

// Create the Zustand store
const useGameStore = create<GameState & GameActions>((set, get) => ({
  // Initial State - tried to load from localStorage or fallback to defaults
  stats: loadStatsFromLocalStorage() || initialStats,
  gameTime: loadGameTimeFromLocalStorage() || { day: 1, hour: 0 },
  currentActivityId: 'idle', // Start with idle
  dailySchedule: loadScheduleFromLocalStorage() || initialSchedule,
  isGameRunning: false,
  gameSpeed: 5000, // 5 seconds per game hour initially for testing
  isLoading: true, // Start as loading
  intervalId: null, // Initialize intervalId as null
  isGameOver: false,
  gameOverReason: null,

  // Add new state for settings
  audioSettings: {
    muted: false,
    bgmVolume: 0.4,
    sfxVolume: 0.6,
  },

  // Save game state to localStorage and backend if user is logged in
  saveGameState: () => {
    const { stats, gameTime, dailySchedule } = get();
    
    // Save to localStorage
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
      localStorage.setItem(GAME_TIME_STORAGE_KEY, JSON.stringify(gameTime));
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(dailySchedule));
      localStorage.setItem(SCHEDULE_STORAGE_KEY + '_timestamp', new Date().toISOString());
      console.log("Game state saved to localStorage");
    } catch (err) {
      console.error("Failed to save game state to localStorage:", err);
    }
    
    // Check if user is logged in before saving to backend
    const session = supabase.auth.session();
    if (session && session.user) {
      // Save to backend
      supabase
        .from('profiles')
        .update({
          game_stats: stats,
          game_time: gameTime,
          daily_schedule: dailySchedule,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to save game state to backend:", error);
          } else {
            console.log("Game state saved to backend");
          }
        });
    }
  },

  // Actions
  startGameLoop: () => {
    const { intervalId, gameSpeed, isGameRunning } = get();
    if (intervalId !== null || isGameRunning) {
      console.log("Game loop already running.");
      return; // Prevent multiple intervals
    }

    console.log("Starting game loop...");
    set({ isGameRunning: true });

    const newIntervalId = setInterval(() => {
      // --- Internal Tick Logic --- 
      const { gameTime, dailySchedule } = get();
      let nextHour = gameTime.hour + 1;
      let nextDay = gameTime.day;

      if (nextHour >= 24) {
        nextHour = 0;
        nextDay += 1;
      }

      // Determine activity for the *next* hour
      const scheduledActivity = dailySchedule[nextHour]?.activityId ?? 'idle';
      const nextActivityId = scheduledActivity || 'idle'; // Fallback to idle

      // Apply effects for the activity scheduled for the hour we are *entering*.
      get().applyActivityEffects(nextActivityId);

      console.log(`Game Time: Day ${nextDay}, Hour ${nextHour}, Activity: ${nextActivityId}`);

      // Update state
      set({ 
        gameTime: { day: nextDay, hour: nextHour },
        currentActivityId: nextActivityId,
      });
      
      // Save the game state after each tick
      get().saveGameState();
      
      // --- End Tick Logic ---

    }, gameSpeed) as unknown as number; // Cast needed for Node/Browser types

    set({ intervalId: newIntervalId });
  },

  pauseGameLoop: () => {
    const { intervalId } = get();
    if (intervalId !== null) {
      console.log("Pausing game loop...");
      clearInterval(intervalId);
      set({ intervalId: null, isGameRunning: false });
      
      // Save the game state when pausing
      get().saveGameState();
    } else {
      console.log("Game loop is not running.");
    }
  },

  // --- Stat Update Logic ---
  applyActivityEffects: (activityId) => {
    const effects = activityEffects[activityId];
    if (!effects) {
      console.warn(`No effects defined for activity: ${activityId}`);
      return; // No effects defined for this activity
    }

    set((state) => {
      const currentStats = state.stats;
      const newStats: Stats = {
        hunger: clamp((currentStats.hunger || 0) + (effects.hunger || 0), 0, 100),
        stress: clamp((currentStats.stress || 0) + (effects.stress || 0), 0, 100),
        tone:   clamp((currentStats.tone || 0)   + (effects.tone || 0), 0, 100),
        health: clamp((currentStats.health || 0) + (effects.health || 0), 0, 100),
        money:  (currentStats.money || 0)  + (effects.money || 0), // Money doesn't seem to have an upper bound in the spec
      };

      console.log("Updating stats:", { 
          activityId, 
          oldStats: currentStats, 
          changes: effects,
          newStats 
      });

      // Check for game over conditions (only stress >= 100 for now)
      if (newStats.stress >= 100) {
        console.error("GAME OVER: Burnout (Stress >= 100)");
        get().pauseGameLoop(); // Stop the game loop
        
        // Save game over state to localStorage
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
        
        return {
          stats: newStats, 
          isGameOver: true, 
          gameOverReason: "Burnout! Stress reached 100."
        };
      }

      return { stats: newStats };
    });
  },

  // --- Game Initialization ---
  initializeGame: async (userId) => {
    if (!userId) {
      console.error("InitializeGame called without userId");
      
      // If no userId but we have localStorage data, use that
      const localSchedule = loadScheduleFromLocalStorage();
      const localStats = loadStatsFromLocalStorage();
      const localGameTime = loadGameTimeFromLocalStorage();
      
      if (localSchedule) {
        set({ dailySchedule: localSchedule });
      }
      
      if (localStats) {
        set({ stats: localStats });
      }
      
      if (localGameTime) {
        set({ gameTime: localGameTime });
      }
      
      set({ isLoading: false });
      get().startGameLoop();
      return;
    }
    
    console.log("Initializing game for user:", userId);
    set({ isLoading: true });
    
    try {
      // Try to load from localStorage first for faster startup
      const localSchedule = loadScheduleFromLocalStorage();
      const localStats = loadStatsFromLocalStorage();
      const localGameTime = loadGameTimeFromLocalStorage();
      
      // Use localStorage data for initial render if available
      if (localSchedule) {
        set({ dailySchedule: localSchedule });
      }
      
      if (localStats) {
        set({ stats: localStats });
      }
      
      if (localGameTime) {
        set({ gameTime: localGameTime });
      }
      
      // Now try to load from backend
      const { data, error } = await supabase
        .from('profiles')
        .select('daily_schedule, game_stats, game_time, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(`Error fetching game data: ${error.message}`);
      }

      // Check for valid backend data and compare timestamps
      if (data) {
        const localTimestamp = localStorage.getItem(SCHEDULE_STORAGE_KEY + '_timestamp');
        const backendHasNewerData = localTimestamp && data.updated_at ? 
          new Date(data.updated_at).getTime() > new Date(localTimestamp).getTime() : true;
        
        // If backend has valid schedule and it's newer, use it
        if (data.daily_schedule && 
            Array.isArray(data.daily_schedule) && 
            data.daily_schedule.length === 24 &&
            backendHasNewerData) {
          console.log("Loaded schedule from DB for game store");
          set({ dailySchedule: data.daily_schedule });
          localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(data.daily_schedule));
        }
        
        // If backend has valid stats and it's newer, use it
        if (data.game_stats && 
            typeof data.game_stats === 'object' && 
            'hunger' in data.game_stats &&
            backendHasNewerData) {
          console.log("Loaded stats from DB for game store");
          set({ stats: data.game_stats as Stats });
          localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data.game_stats));
        }
        
        // If backend has valid game time and it's newer, use it
        if (data.game_time && 
            typeof data.game_time === 'object' && 
            'day' in data.game_time && 
            'hour' in data.game_time &&
            backendHasNewerData) {
          console.log("Loaded game time from DB for game store");
          set({ gameTime: data.game_time as { day: number; hour: number } });
          localStorage.setItem(GAME_TIME_STORAGE_KEY, JSON.stringify(data.game_time));
        }
        
        // Update timestamp
        if (backendHasNewerData) {
          localStorage.setItem(SCHEDULE_STORAGE_KEY + '_timestamp', new Date(data.updated_at).toISOString());
        }
      }
    } catch (err: any) {
      console.error("Failed to load game data during init:", err.message);
      // We already set local data if available, so we can continue
    } finally {
      set({ isLoading: false });
      // Start the game loop after attempting to load data
      get().startGameLoop(); 
    }
  },

  // Allow external components to update the schedule
  setSchedule: (newSchedule) => {
    set({ dailySchedule: newSchedule });
    
    // Save the updated schedule
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(newSchedule));
      localStorage.setItem(SCHEDULE_STORAGE_KEY + '_timestamp', new Date().toISOString());
      console.log("Schedule saved to localStorage from setSchedule");
    } catch (err) {
      console.error("Failed to save schedule to localStorage:", err);
    }
    
    // Save to backend if user is logged in
    const session = supabase.auth.session();
    if (session && session.user) {
      supabase
        .from('profiles')
        .update({
          daily_schedule: newSchedule,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to save schedule to backend from setSchedule:", error);
          } else {
            console.log("Schedule saved to backend from setSchedule");
          }
        });
    }
  },

  resetGame: () => {
    // Ensure any running loop is stopped before resetting
    const { intervalId } = get();
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    
    // Reset to initial state
    set({
      stats: initialStats,
      gameTime: { day: 1, hour: 0 },
      currentActivityId: 'idle',
      dailySchedule: initialSchedule,
      isGameRunning: false,
      isLoading: false,
      intervalId: null, // Ensure intervalId is cleared
      isGameOver: false, // Reset game over state
      gameOverReason: null, // Clear reason
    });
    
    // Save reset state to localStorage
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(initialStats));
    localStorage.setItem(GAME_TIME_STORAGE_KEY, JSON.stringify({ day: 1, hour: 0 }));
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(initialSchedule));
    localStorage.setItem(SCHEDULE_STORAGE_KEY + '_timestamp', new Date().toISOString());
    
    // Save reset state to backend if user is logged in
    const session = supabase.auth.session();
    if (session && session.user) {
      supabase
        .from('profiles')
        .update({
          game_stats: initialStats,
          game_time: { day: 1, hour: 0 },
          daily_schedule: initialSchedule,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to save reset game state to backend:", error);
          } else {
            console.log("Reset game state saved to backend");
          }
        });
    }
  },

  // Add methods for applying stat changes from events
  applyStatChanges: (changes) => {
    set((state) => {
      const currentStats = state.stats;
      const newStats: Stats = { ...currentStats };
      
      // Apply each stat change
      Object.entries(changes).forEach(([statName, value]) => {
        if (statName in newStats) {
          const statKey = statName as keyof Stats;
          
          if (statKey === 'money') {
            // Money has no upper bound
            newStats[statKey] = (currentStats[statKey] || 0) + value;
          } else {
            // Other stats are clamped between 0 and 100
            newStats[statKey] = clamp(
              (currentStats[statKey] || 0) + value, 
              0, 
              100
            );
          }
        }
      });
      
      console.log("Applying stat changes from event/action:", { 
        changes, 
        oldStats: currentStats, 
        newStats 
      });
      
      // Check for game over conditions
      if (newStats.stress >= 100) {
        console.error("GAME OVER: Burnout (Stress >= 100)");
        get().pauseGameLoop(); // Stop the game loop
        
        // Save game over state to localStorage
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
        
        return {
          stats: newStats, 
          isGameOver: true, 
          gameOverReason: "Burnout! Stress reached 100."
        };
      }
      
      // Save state to localStorage after applying changes
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
      
      return { stats: newStats };
    });
  },
  
  // Update audio settings
  updateAudioSettings: (settings) => {
    set((state) => ({
      audioSettings: {
        ...state.audioSettings,
        ...settings,
      }
    }));
  },
}));

export default useGameStore;
