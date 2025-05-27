import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import ActivityPalette from './ActivityPalette';
import TimeSlot from './TimeSlot';
import { useAuthStore } from 'utils/authStore'; // Import auth store hook
import { supabase } from 'utils/supabaseClient'; // Import supabase client
import { toast } from 'sonner'; // For notifications
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorMessage from './ui/ErrorMessage';

// Local storage key for schedule
const SCHEDULE_STORAGE_KEY = 'userSchedule';

const TimelineSidebar = () => {
  // --- State Management ---
  // Initialize schedule state with 24 hours, default to 'idle'
  const [schedule, setSchedule] = useState<Array<{ activityId: string | null }>>(
    Array(24).fill(null).map(() => ({ activityId: 'idle' }))
  );
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Auth state ---
  const { user, session } = useAuthStore();

  // --- Load Schedule Effect ---
  useEffect(() => {
    const loadSchedule = async () => {
      if (!session || !user) {
        console.log("User not logged in, checking localStorage only");
        // Try to load from localStorage even if not logged in
        loadFromLocalStorage();
        setIsLoadingSchedule(false);
        return;
      }

      setIsLoadingSchedule(true);
      setError(null);

      try {
        // First check localStorage for most recent changes
        const localSchedule = loadFromLocalStorage();
        
        // If we have a local schedule, use it temporarily while we fetch from backend
        if (localSchedule) {
          setSchedule(localSchedule);
        }

        // Now fetch from backend
        const { data, error } = await supabase
          .from('profiles')
          .select('daily_schedule')
          .eq('id', user.id)
          .single();

        if (error) {
          throw new Error(`Error fetching schedule: ${error.message}`);
        }

        if (data?.daily_schedule && Array.isArray(data.daily_schedule)) {
          // Validate the structure minimally (e.g., array of 24 objects with activityId)
          if (data.daily_schedule.length === 24 && 
              data.daily_schedule.every((slot: any) => typeof slot === 'object' && slot !== null && 'activityId' in slot)) {
            console.log("Loaded schedule from DB:", data.daily_schedule);
            
            // Check if local storage timestamp is newer than backend data
            const localStorageTime = localStorage.getItem(SCHEDULE_STORAGE_KEY + '_timestamp');
            if (localStorageTime && data.updated_at) {
              const localTime = new Date(localStorageTime).getTime();
              const dbTime = new Date(data.updated_at).getTime();
              
              if (localTime > dbTime) {
                console.log("Local schedule is newer than DB schedule, keeping local version");
                // Keep using the local schedule we already loaded
                if (localSchedule) {
                  // Sync the local schedule to the backend
                  saveToBackend(localSchedule);
                }
              } else {
                console.log("DB schedule is newer than local, using DB version");
                setSchedule(data.daily_schedule as Array<{ activityId: string | null }>);
                // Update localStorage with newer backend data
                saveToLocalStorage(data.daily_schedule);
              }
            } else {
              // No timestamp comparison possible, use DB version as source of truth
              setSchedule(data.daily_schedule as Array<{ activityId: string | null }>);
              saveToLocalStorage(data.daily_schedule);
            }
          } else {
            console.warn("Loaded schedule data is invalid, using default or localStorage.");
          }
        } else {
          // No schedule saved yet on backend, or data is null/not an array
          console.log("No schedule found in DB or data is null/invalid, using localStorage or default.");
          
          // If we have a local schedule, sync it to backend
          if (localSchedule) {
            saveToBackend(localSchedule);
          } else {
            // Use default schedule
            const defaultSchedule = Array(24).fill(null).map(() => ({ activityId: 'idle' }));
            setSchedule(defaultSchedule);
            saveToLocalStorage(defaultSchedule);
          }
        }
      } catch (err: any) {
        console.error(err.message);
        setError("Failed to load your schedule from the server. Using locally saved data if available.");
        // Keep using localStorage data if we loaded it
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [session, user]); // Rerun if session or user changes

  // --- Helper Methods ---
  const saveToLocalStorage = (scheduleData: Array<{ activityId: string | null }>) => {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(scheduleData));
      localStorage.setItem(SCHEDULE_STORAGE_KEY + '_timestamp', new Date().toISOString());
      console.log("Schedule saved to localStorage");
    } catch (err) {
      console.error("Failed to save schedule to localStorage:", err);
    }
  };

  const loadFromLocalStorage = (): Array<{ activityId: string | null }> | null => {
    try {
      const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsedSchedule = JSON.parse(saved);
        if (Array.isArray(parsedSchedule) && 
            parsedSchedule.length === 24 && 
            parsedSchedule.every((slot: any) => typeof slot === 'object' && slot !== null && 'activityId' in slot)) {
          console.log("Loaded schedule from localStorage");
          return parsedSchedule;
        }
      }
    } catch (err) {
      console.error("Failed to load schedule from localStorage:", err);
    }
    return null;
  };

  const saveToBackend = async (scheduleData: Array<{ activityId: string | null }>) => {
    if (!user || !session) {
      toast.error("You must be logged in to save your schedule");
      return;
    }

    setSavingSchedule(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          daily_schedule: scheduleData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);
      
      toast.success("Schedule saved successfully");
      console.log("Schedule saved to backend");
    } catch (err: any) {
      console.error("Failed to save schedule to backend:", err.message);
      setError("Failed to save your schedule to the server. Changes are saved locally.");
      toast.error("Failed to save schedule to server");
    } finally {
      setSavingSchedule(false);
    }
  };

  // --- Drag and Drop Handler ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log("Drag ended:", { activeId: active.id, overId: over?.id });

    if (over && active.data.current?.type === 'activity' && over.data.current?.type === 'timeslot') {
      const hour = over.data.current.hour;
      const activityId = active.data.current.activityId;
      console.log(`Activity '${activityId}' dropped on hour ${hour}`);

      // --- Update schedule state ---
      setSchedule(currentSchedule => {
        const newSchedule = [...currentSchedule];
        // Ensure the hour is within bounds
        if (hour >= 0 && hour < newSchedule.length) {
          newSchedule[hour] = { activityId: activityId };
        }
        
        // Save to localStorage immediately on any change
        saveToLocalStorage(newSchedule);
        
        // Debounced save to backend
        const timeoutId = setTimeout(() => {
          saveToBackend(newSchedule);
        }, 2000); // 2 second debounce
        
        // Clean up timeout on next update
        return () => clearTimeout(timeoutId);
        
        return newSchedule;
      });
    } else {
      console.log("Invalid drop or drag cancelled");
    }
  };

  // --- Handle Manual Save ---
  const handleSaveSchedule = () => {
    saveToBackend(schedule);
  };

  // --- Retry Loading ---
  const handleRetryLoading = () => {
    setIsLoadingSchedule(true);
    setError(null);
    // Re-run the useEffect by changing dependencies
    // This is a hack, in a real app consider a better approach
    useAuthStore.getState().checkSession();
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full w-72 bg-white/80 backdrop-blur-sm shadow-lg border-l border-stone-200 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-center text-stone-700">Daily Schedule</h3>

        {/* Activity Palette Section */}
        <ActivityPalette />

        {isLoadingSchedule ? (
          <div className="flex-grow flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex-grow">
            <ErrorMessage 
              message={error} 
              onRetry={handleRetryLoading}
              className="mb-4"
            />
            <div className="overflow-y-auto space-y-1 pr-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <h4 className="text-sm font-medium text-stone-600 mb-2 sticky top-0 bg-white/80 backdrop-blur-sm pt-1">Timeline (24h)</h4>
              {schedule.map((slot, hour) => (
                <TimeSlot key={hour} hour={hour} assignedActivity={slot.activityId} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto space-y-1 pr-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <h4 className="text-sm font-medium text-stone-600 mb-2 sticky top-0 bg-white/80 backdrop-blur-sm pt-1">Timeline (24h)</h4>
            {schedule.map((slot, hour) => (
              <TimeSlot key={hour} hour={hour} assignedActivity={slot.activityId} />
            ))}
          </div>
        )}

        {/* Buttons for Presets and Save */}
        <div className="flex flex-col space-y-2 pt-2 border-t border-stone-200">
          <button 
            className="text-xs p-1 border rounded bg-stone-100 hover:bg-stone-200"
            disabled={isLoadingSchedule}
          >
            Load Preset
          </button>
          <button 
            className="text-xs p-1 border rounded bg-orange-400 hover:bg-orange-500 text-white relative"
            onClick={handleSaveSchedule}
            disabled={isLoadingSchedule || savingSchedule}
          >
            {savingSchedule ? (
              <>
                <span className="opacity-0">Save Schedule</span>
                <LoadingSpinner size="sm" className="absolute inset-0" />
              </>
            ) : (
              "Save Schedule"
            )}
          </button>
        </div>
      </div>
    </DndContext>
  );
};

export default TimelineSidebar;
