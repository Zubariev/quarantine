import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from "@/components/ui/progress";
import { HeartPulse, Brain, Zap, Apple, CircleDollarSign } from 'lucide-react'; // Icons
import useGameStore from 'utils/gameStore'; // Import the game store

// Helper to determine color based on value
const getBarColorClass = (value: number): string => {
  if (value < 20) return "rgb(239 68 68)"; // Red
  if (value < 50) return "rgb(245 158 11)"; // Yellow/Amber
  return "rgb(34 197 94)"; // Green
};

interface StatProps {
  value: number;
  label: string;
  icon: React.ElementType;
  isMoney?: boolean;
}

const StatDisplay: React.FC<StatProps> = ({ value, label, icon: Icon, isMoney = false }) => {
  // Ensure value is within 0-100 for Progress component
  const displayValue = Math.max(0, Math.min(100, value));
  const barColor = getBarColorClass(displayValue);

  return (
    <div className="w-full relative">
      <div className="flex justify-between text-xs mb-1 z-20 relative">
        <div className="flex items-center space-x-1.5">
          <Icon className="h-4 w-4 text-gray-600 z-20" />
          <span>{label}</span>
        </div>
        <motion.span
          key={`${label}-value`}
          initial={{ opacity: 0.5, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isMoney ? `$${value}` : `${value}%`}
        </motion.span>
      </div>
      
      {!isMoney && (
        <div className="relative h-2 overflow-hidden bg-gray-200 rounded">
          <motion.div
            className="absolute top-0 left-0 h-full rounded"
            style={{ backgroundColor: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${displayValue}%` }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
            }}
          />
        </div>
      )}
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
    <motion.div 
      className="w-full bg-white/70 backdrop-blur-sm shadow-md p-3 sticky top-0 z-30"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <div className="flex flex-col space-y-2 max-w-4xl mx-auto">
        {statsData.map((stat) => {
          // Calculate the current stat value
          const statValue = stats[stat.key as keyof typeof stats];
          
          return (
            <StatDisplay
              key={stat.name}
              value={typeof statValue === 'number' ? statValue : 0}
              label={stat.name}
              icon={stat.icon}
              isMoney={stat.isMoney}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default StatsHud;

