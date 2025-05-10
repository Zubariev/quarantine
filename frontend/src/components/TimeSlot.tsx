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

// Color mapping for Tailwind classes
const colorMap: { [key: string]: string } = {
  red: 'bg-red-100 hover:bg-red-200 border-red-200 text-red-800',
  orange: 'bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-800',
  amber: 'bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-800',
  yellow: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200 text-yellow-800',
  lime: 'bg-lime-100 hover:bg-lime-200 border-lime-200 text-lime-800',
  green: 'bg-green-100 hover:bg-green-200 border-green-200 text-green-800',
  emerald: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-800',
  teal: 'bg-teal-100 hover:bg-teal-200 border-teal-200 text-teal-800',
  cyan: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-200 text-cyan-800',
  sky: 'bg-sky-100 hover:bg-sky-200 border-sky-200 text-sky-800',
  blue: 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-800',
  indigo: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-200 text-indigo-800',
  violet: 'bg-violet-100 hover:bg-violet-200 border-violet-200 text-violet-800',
  purple: 'bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-800',
  fuchsia: 'bg-fuchsia-100 hover:bg-fuchsia-200 border-fuchsia-200 text-fuchsia-800',
  pink: 'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-800',
  rose: 'bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-800',
  slate: 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800',
  gray: 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800',
  zinc: 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800',
  stone: 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-800',
};

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

  // Get activity styles or fallback to 'idle'
  const activity = assignedActivity && activityStyles[assignedActivity] 
    ? activityStyles[assignedActivity] 
    : activityStyles['idle'];
  
  const colorName = activity.color;
  const colorClasses = colorMap[colorName] || colorMap.stone; // Default to stone if color not found
  
  // Handle hover and selected states
  const hoverClasses = isOver ? 'ring-2 ring-opacity-50' : '';
  const ringColor = isOver ? `ring-${colorName}-400` : '';

  return (
    <div
      ref={setNodeRef} // Assign ref for droppable
      className={`
        flex items-center justify-between p-1.5 border rounded h-8 
        transition-colors duration-150 
        ${colorClasses} ${hoverClasses} ${ringColor}
      `}
    >
      <span className="text-xs font-medium text-stone-500 w-10 text-right mr-2">
        {formatHour(hour)}
      </span>
      <span className="flex-grow text-xs text-center font-medium truncate">
        {activity.name}
      </span>
    </div>
  );
};

export default TimeSlot;
