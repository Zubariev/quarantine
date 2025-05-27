import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import useGameStore from 'utils/gameStore';
import { Button } from '@/components/ui/button';

// Define the structure for event options
interface EventOption {
  label: string;
  effects: {
    [key: string]: number;
  };
  description: string;
}

// Define the event structure
export interface GameEvent {
  id: string;
  title: string;
  description: string;
  image?: string;
  options: EventOption[];
}

interface EventPopupProps {
  event: GameEvent | null;
  onClose: () => void;
}

const EventPopup: React.FC<EventPopupProps> = ({ event, onClose }) => {
  const { applyStatChanges } = useGameStore();

  if (!event) return null;

  const handleOptionSelect = (option: EventOption) => {
    // Apply the stat effects from the selected option
    applyStatChanges(option.effects);
    
    // Show the result briefly
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {event && (
        <motion.div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the backdrop
        >
          <motion.div 
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="relative">
              {/* Event Image */}
              {event.image && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={event.image} 
                    alt={event.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Event Content */}
            <div className="p-5">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
              <p className="text-gray-600 mb-6">{event.description}</p>
              
              {/* Event Options */}
              <div className="space-y-3">
                {event.options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleOptionSelect(option)}
                    className="w-full justify-between group overflow-hidden relative"
                    variant="outline"
                  >
                    <span>{option.label}</span>
                    
                    {/* Show stat changes on hover */}
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-blue-100 to-purple-100 overflow-hidden flex justify-center items-center text-xs py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={{ height: 0 }}
                      whileHover={{ height: '24px' }}
                    >
                      {Object.entries(option.effects).map(([stat, value], i) => (
                        <span key={i} className="mx-1">
                          <span className="capitalize">{stat}:</span>
                          <span className={value > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                            {value > 0 ? `+${value}` : value}
                          </span>
                        </span>
                      ))}
                    </motion.div>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EventPopup; 