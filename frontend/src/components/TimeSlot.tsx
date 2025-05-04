
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { activities } from './ActivityPalette'; // Import activities for styling info

interface TimeSlotProps {
  hour: number; // 0-23
  assignedActivity: string | null; // ID of the activity assigned
}

// Generate styles from imported activities list
const activityStyles: { [key: string]: { color: string; name: string } } = 
  activities.reduce((acc, activity) => {
    acc[activity.id] = { color: activity.color, name: activity.name };
    return acc;
  }, {} as { [key: string]: { color: string; name: string } });

const TimeSlot: React.FC<TimeSlotProps> = ({ hour, assignedActivity }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeslot-${hour}`, // Unique ID for DnD
    data: { // Data associated with the drop zone
      hour: hour,
      type: 'timeslot',
    },
  });
  const formatHour = (h: number): string => {
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 || h === 24 ? 'AM' : 'PM'; // Handle midnight (0) and noon (12)
     if (h === 0) return `12 AM`;
     if (h === 12) return `12 PM`;
    return `${hour12} ${ampm}`;
  };

  const activity = assignedActivity && activityStyles[assignedActivity] ? activityStyles[assignedActivity] : activityStyles['idle'];
  const colorName = activity.color;

  return (
    <div
      ref={setNodeRef} // Assign ref for droppable
      className={`flex items-center justify-between p-1.5 border rounded h-8 transition-colors duration-150 ${isOver ? `bg-${colorName}-200 ring-2 ring-${colorName}-400` : `bg-${colorName}-100 border-${colorName}-200`}`}
    >
      <span className="text-xs font-medium text-stone-500 w-10 text-right mr-2">{formatHour(hour)}</span>
      <span className={`flex-grow text-xs text-center text-${colorName}-800 font-medium`}>
        {activity.name}
      </span>
    </div>
  );
};

export default TimeSlot;
