
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { HeartPulse, Brain, Zap, Apple, CircleDollarSign } from 'lucide-react'; // Icons
import useGameStore from 'utils/gameStore'; // Import the game store

// Helper to determine color based on value
const getBarColorClass = (value: number): string => {
  if (value < 20) return "bg-red-500"; // Use Tailwind class for red
  if (value < 50) return "bg-yellow-500"; // Use Tailwind class for yellow
  return "bg-green-500"; // Use Tailwind class for green
};

interface StatProps {
  value: number;
  label: string;
  icon: React.ElementType;
  colorClass: string; // Tailwind class for progress bar color
}

interface StatsHudProps {
  stats: {
    hunger: number;
    stress: number;
    tone: number;
    health: number;
    money: number; // Assuming money is also 0-100 for simplicity, adjust if needed
  };
}

const StatDisplay: React.FC<StatProps> = ({ value, label, icon: Icon, colorClass }) => {
   // Ensure value is within 0-100 for Progress component
   const displayValue = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center space-y-1 flex-1 min-w-[100px]">
      <div className="flex items-center space-x-1.5 text-sm font-medium text-stone-700">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <Progress value={displayValue} className={`w-full h-2 [&>*]:bg-${colorClass}-500`} />
       {/* Display numerical value below bar */}
       <span className="text-xs text-stone-600">{value}%</span>
    </div>
  );
};


const StatsHud: React.FC = () => {
  // Get stats from the game store
  const stats = useGameStore((state) => state.stats);
  // Define stats data with icons
  const statsData = [
    { name: 'Health', key: 'health', icon: HeartPulse, isMoney: false },
    { name: 'Stress', key: 'stress', icon: Brain, isMoney: false },
    { name: 'Tone', key: 'tone', icon: Zap, isMoney: false },
    { name: 'Hunger', key: 'hunger', icon: Apple, isMoney: false },
    { name: 'Money', key: 'money', icon: CircleDollarSign, isMoney: true },
  ];

  return (
    <div className="w-full bg-white/70 backdrop-blur-sm shadow-md p-2 sticky top-0 z-10">
      <div className="flex flex-col space-y-2 max-w-4xl mx-auto">
        {statsData.map((stat) => (
            <div key={stat.name} className="flex items-center space-x-2">
              <stat.icon className="h-5 w-5 text-gray-600" />
              <div className="w-full">
                <div className="flex justify-between text-xs mb-1">
                  <span>{stat.name}</span>
                  {/* Use live stat value */}
                  <span>{stat.isMoney ? `$${stats.money}` : `${statValue}%`}</span>
                </div>
                {!stat.isMoney && (
                  <Progress 
                    value={statValue} 
                    // Apply dynamic color using Tailwind class on the indicator part
                    className={`h-2 [&>*]:${getBarColorClass(statValue)}`} 
                  />
                )}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default StatsHud;

