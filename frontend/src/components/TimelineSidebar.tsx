
import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import ActivityPalette from './ActivityPalette';
import TimeSlot from './TimeSlot';
import useAuth from 'utils/authStore'; // Import auth store hook
import supabase from 'utils/supabaseClient'; // Import supabase client
import { toast } from 'sonner'; // For potential error notifications

// Placeholder for the 24-hour schedule state
// Get schedule state from useState
// const initialSchedule = Array(24).fill({ activityId: 'idle' }); // Default to idle

const TimelineSidebar = () => {
  // --- State Management ---
  // Initialize schedule state with 24 hours, default to 'idle'
  const [schedule, setSchedule] = useState<Array<{ activityId: string | null }>>(
    Array(24).fill(null).map(() => ({ activityId: 'idle' }))
  );
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true); // Loading state

  // --- Auth state ---
  const { user, session } = useAuth();

  // --- Load Schedule Effect ---
  useEffect(() => {
    const loadSchedule = async () => {
      if (!session || !user) {
        // Should not happen if GamePage redirects correctly, but good practice
        console.log("User not logged in, cannot load schedule.");
        setIsLoadingSchedule(false);
        return;
      }

      setIsLoadingSchedule(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('daily_schedule')
          .eq('id', user.id)
          .single();

        if (error) {
          // Handle potential errors, e.g., profile not found (shouldn't happen with trigger)
          // or RLS issues
          throw new Error(`Error fetching schedule: ${error.message}`);
        }

        if (data?.daily_schedule && Array.isArray(data.daily_schedule)) {
           // Validate the structure minimally (e.g., array of 24 objects with activityId)
           if (data.daily_schedule.length === 24 && 
               data.daily_schedule.every((slot: any) => typeof slot === 'object' && slot !== null && 'activityId' in slot)) {
             console.log("Loaded schedule from DB:", data.daily_schedule);
             setSchedule(data.daily_schedule as Array<{ activityId: string | null }>);
           } else {
             console.warn("Loaded schedule data is invalid, using default.", data.daily_schedule);
             // Keep default schedule if loaded data is malformed
             setSchedule(Array(24).fill(null).map(() => ({ activityId: 'idle' }))); 
           }
        } else {
          // No schedule saved yet, or data is null/not an array, keep default
          console.log("No schedule found in DB or data is null/invalid, using default.");
           // Ensure default is set if initial state wasn't default for some reason
           setSchedule(Array(24).fill(null).map(() => ({ activityId: 'idle' }))); 
        }

      } catch (err: any) {
        console.error(err.message);
        toast.error("Could not load your saved schedule.");
        // Keep default schedule on error
         setSchedule(Array(24).fill(null).map(() => ({ activityId: 'idle' }))); 
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [session, user]); // Rerun if session or user changes

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
        return newSchedule;
      });
      // --- End state update logic --- 

    } else {
      console.log("Invalid drop or drag cancelled");
    }
  };
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full w-72 bg-white/80 backdrop-blur-sm shadow-lg border-l border-stone-200 p-4 space-y-4"> {/* Increased width */}
      <h3 className="text-lg font-semibold text-center text-stone-700">Daily Schedule</h3>

      {/* Activity Palette Section */}
      <ActivityPalette />

      <div className="flex-grow overflow-y-auto space-y-1 pr-2" style={{ maxHeight: 'calc(100vh - 200px)' }}> {/* Limit height */} 
        <h4 className="text-sm font-medium text-stone-600 mb-2 sticky top-0 bg-white/80 backdrop-blur-sm pt-1">Timeline (24h)</h4>
        {schedule.map((slot, hour) => (
          // Pass the current activityId from the state
          <TimeSlot key={hour} hour={hour} assignedActivity={slot.activityId} />
        ))}
      </div>

       {/* Buttons for Presets and Save */}
       <div className="flex flex-col space-y-2 pt-2 border-t border-stone-200">
          <button className="text-xs p-1 border rounded bg-stone-100 hover:bg-stone-200">Load Preset</button>
          <button className="text-xs p-1 border rounded bg-orange-400 hover:bg-orange-500 text-white">Save Schedule</button>
       </div>
      </div>
    </DndContext>
  );
};

export default TimelineSidebar;
