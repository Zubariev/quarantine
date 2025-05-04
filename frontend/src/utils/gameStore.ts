// Define stat changes per hour for each activity\n// Based on user requirements doc\nconst activityEffects: { \n  [key: string]: Partial<Stats> \n} = {\n  work:          { hunger: -5, stress: +5, tone: -5, money: +10 },\n  sleep:         {            stress: -8, tone: +10, health: +2 },\n  eat_fast:      { hunger: +50, stress: -2, tone: -2, health: -10, money: -5 }, // Assuming this is \'Order Fast Food\'\n  eat_healthy:   { hunger: +30, stress: -1,           health: +5,  money: -15}, // Assuming this is \'Order Healthy Meal\'\n  tv:            { hunger: -1, stress: -10, tone: -5 }, // Assuming this is \'Watch TV / Stream\'\n  games:         { hunger: -1, stress: -15, tone: -10, health: -5 }, // Assuming this is \'Play Computer Games\'\n  read:          { hunger: -1, stress: -8, tone: -5,  health: +2 }, // Assuming this is \'Read Books\'\n  // water_flower: {             stress: -5,           health: +1 }, // Name mismatch, skipping for now - User prompt used \'Water & Trim Flower\'\n  exercise:      { hunger: -2, stress: -5, tone: +5,  health: +3 }, // Assuming this is \'Exercise (In-room)\'\n  meditate:      {            stress: -10, tone: +2,  health: +1 }, // Assuming this is \'Meditation\'\n  idle:          { hunger: -2, stress: +1, tone: -1 }, // Default penalty for doing nothing?\ Added placeholder effect.\n};\n\n// Helper function to clamp values within a range\nconst clamp = (value: number, min: number, max: number): number => {\n  return Math.max(min, Math.min(value, max));\n};\n\n
import { create } from 'zustand';
import supabase from 'utils/supabaseClient'; // Import supabase
import { Session, User } from '@supabase/supabase-js'; // Import types
import { activities } from 'components/ActivityPalette'; // Use defined activities

// Define the structure for character stats
interface Stats {
  hunger: number; // 0-100
  stress: number; // 0-100
  tone: number;   // Energy 0-100
  health: number; // 0-100
  money: number;
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
}

// Define actions that can be performed on the state
interface GameActions {
  initializeGame: (userId: string) => Promise<void>; // New init action
  startGameLoop: () => void;
  pauseGameLoop: () => void;
  applyActivityEffects: (activityId: string) => void; // Action to apply effects
  setSchedule: (newSchedule: Array<{ activityId: string | null }>) => void; // Allow external schedule updates
  resetGame: () => void; // Resets to initial state
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

// Create the Zustand store
const useGameStore = create<GameState & GameActions>((set, get) => ({
  // Initial State
  stats: initialStats,
  gameTime: { day: 1, hour: 0 },
  currentActivityId: 'idle', // Start with idle
  dailySchedule: initialSchedule,
  isGameRunning: false,
  gameSpeed: 5000, // 5 seconds per game hour initially for testing
  isLoading: true, // Start as loading
  intervalId: null, // Initialize intervalId as null

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

      // TODO: Trigger stat updates based on the activity of the *current* hour before advancing?
      // Or apply effects for the activity of the *next* hour after advancing?
      // Apply effects for the activity scheduled for the hour we are *entering*.
      get().applyActivityEffects(nextActivityId);

      console.log(`Game Time: Day ${nextDay}, Hour ${nextHour}, Activity: ${nextActivityId}`);

      // Update state
      set({ 
        gameTime: { day: nextDay, hour: nextHour },
        currentActivityId: nextActivityId,
      });
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
      set({ isLoading: false });
      return;
    }
    console.log("Initializing game for user:", userId);
    set({ isLoading: true });
    let loadedSchedule = initialSchedule; // Default to initial if load fails

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('daily_schedule')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(`Error fetching schedule: ${error.message}`);
      }

      if (data?.daily_schedule && Array.isArray(data.daily_schedule)) {
        if (
          data.daily_schedule.length === 24 &&
          data.daily_schedule.every(
            (slot: any) =>
              typeof slot === 'object' && slot !== null && 'activityId' in slot
          )
        ) {
          console.log("Loaded schedule from DB for game store:", data.daily_schedule);
          loadedSchedule = data.daily_schedule as Array<{ activityId: string | null }>;
        } else {
          console.warn("Loaded schedule data is invalid for game store, using default.");
          // Keep default schedule
        }
      } else {
        console.log("No schedule found in DB for game store, using default.");
        // Keep default schedule
      }
    } catch (err: any) {
      console.error("Failed to load schedule during game init:", err.message);
      // Keep default schedule on error
    } finally {
      set({ dailySchedule: loadedSchedule, isLoading: false });
      // Start the game loop after attempting to load schedule
      get().startGameLoop(); 
    }
  },

  // TODO: Implement actual logic for these actions later
  // setSchedule: (newSchedule) => set({ dailySchedule: newSchedule }),
  // loadInitialData: async () => { /* Fetch schedule etc. */ },

  resetGame: () => {
    // Ensure any running loop is stopped before resetting
    const { intervalId } = get();
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
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
  },
}));

export default useGameStore;
