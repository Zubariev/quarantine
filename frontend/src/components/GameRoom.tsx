
import React from 'react';

// Placeholder components for room items
const RoomItem: React.FC<{ label: string; className?: string; children?: React.ReactNode }> = ({ label, className, children }) => (
  <div className={`border border-stone-300 bg-white/80 rounded-lg shadow-sm p-2 text-center text-xs text-stone-500 ${className}`}>
    {children || label}
  </div>
);

const GameRoom: React.FC = () => {
  return (
    <div className="relative w-full max-w-3xl h-[500px] bg-amber-50 rounded-xl shadow-inner border border-amber-200 p-4 grid grid-cols-3 grid-rows-3 gap-4">
      {/* Using grid layout for positioning items - adjust spans and positions as needed */}

      {/* Row 1 */}
      <div className="col-span-1 row-span-1 flex items-center justify-center">
        <RoomItem label="Bookshelf" className="h-full w-2/3 bg-orange-100 border-orange-300">
          📚
        </RoomItem>
      </div>

      <div className="col-span-1 row-span-1 flex items-center justify-center">
         {/* Placeholder for Character Avatar later */}
         <div className="w-16 h-24 bg-pink-200 rounded-md border border-pink-300 flex items-center justify-center text-sm">
             👤
         </div>
      </div>

      <div className="col-span-1 row-span-1 flex items-center justify-center">
         <RoomItem label="Window" className="h-4/5 w-4/5 bg-blue-100 border-blue-300">
            {/* Plant */}
            <div className="absolute bottom-1 right-1 w-6 h-8 bg-green-200 rounded-t-md border border-green-400 text-xs">
                🌱
            </div>
            ☀️
         </RoomItem>
      </div>

      {/* Row 2 - Middle */}
       <div className="col-span-1 row-span-1 flex items-center justify-center">
         <RoomItem label="TV" className="h-2/3 w-full bg-stone-200 border-stone-400">
            📺
        </RoomItem>
      </div>

       <div className="col-span-1 row-span-1">{/* Center Space */}</div>

      <div className="col-span-1 row-span-1 flex items-center justify-center">
         <RoomItem label="Computer Desk" className="h-2/3 w-full bg-sky-100 border-sky-300">
             🖥️
         </RoomItem>
      </div>

      {/* Row 3 - Bottom */}
      <div className="col-span-1 row-span-1">{/* Empty Corner */}</div>

      <div className="col-span-1 row-span-1 flex items-center justify-center">
         <RoomItem label="Bed" className="h-full w-full bg-purple-100 border-purple-300">
             🛏️
         </RoomItem>
      </div>

       <div className="col-span-1 row-span-1">{/* Empty Corner */}</div>

    </div>
  );
};

export default GameRoom;
