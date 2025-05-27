
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Define activities with consistent IDs and data
export const activities = [
  { id: 'work', name: 'Work', color: 'blue' },
  { id: 'sleep', name: 'Sleep', color: 'purple' },
  { id: 'eat_fast', name: 'Eat Fast', color: 'red' },
  { id: 'eat_healthy', name: 'Eat Healthy', color: 'green' },
  { id: 'tv', name: 'Watch TV', color: 'gray' },
  { id: 'games', name: 'Play Games', color: 'indigo' },
  { id: 'read', name: 'Read Books', color: 'orange' },
  { id: 'exercise', name: 'Exercise', color: 'teal' },
  { id: 'meditate', name: 'Meditate', color: 'cyan' },
  { id: 'idle', name: 'Idle', color: 'stone' }, // Keep idle if needed as a draggable option
];


interface DraggableActivityProps {
  activity: typeof activities[0];
}

const DraggableActivity: React.FC<DraggableActivityProps> = ({ activity }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `activity-${activity.id}`, // Unique ID for DnD
    data: { // Data transferred during drag
      activityId: activity.id,
      type: 'activity',
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
    // Prevent selection while dragging
    WebkitUserSelect: 'none' as const,
    MozUserSelect: 'none' as const,
    msUserSelect: 'none' as const,
    userSelect: 'none' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-1 border rounded text-xs text-center cursor-grab bg-${activity.color}-100 border-${activity.color}-300 hover:shadow-md active:shadow-lg`}
    >
      {activity.name}
    </div>
  );
};

const ActivityPalette = () => {
  return (
    <div className="border rounded p-2 bg-stone-50">
      <h4 className="text-sm font-medium text-stone-600 mb-2 text-center">Activities</h4>
      <div className="grid grid-cols-2 gap-1">
        {activities.filter(a => a.id !== 'idle').map((activity) => (
          <DraggableActivity key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
};

export default ActivityPalette;
