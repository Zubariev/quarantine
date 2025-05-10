import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info } from 'lucide-react';

export type NotificationType = 'warning' | 'info' | 'critical';

interface NotificationProps {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // Duration in ms before auto-dismiss
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration === 0) return; // Don't auto-dismiss if duration is 0
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Extra delay for exit animation
      setTimeout(() => onDismiss(id), 300);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, id, onDismiss]);

  // Handle manual dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  // Get the appropriate colors and icon based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
        };
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Info className="w-4 h-4 text-blue-500" />,
        };
    }
  };

  const styles = getTypeStyles();

  // Screen shake for critical notifications
  const shakingAnimation = type === 'critical' ? {
    x: [0, -5, 5, -5, 5, 0],
    transition: { duration: 0.5 }
  } : {};

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`p-3 rounded-lg shadow-md border ${styles.bg} ${styles.border} ${styles.text} max-w-md relative speech-bubble-${type}`}
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            ...shakingAnimation
          }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          layout
          style={{
            position: 'relative',
          }}
        >
          {/* Speech bubble triangle */}
          <div 
            className={`absolute w-4 h-4 ${styles.bg} border-l border-b ${styles.border} transform rotate-45`}
            style={{ 
              bottom: '-8px', 
              left: '20px', 
              zIndex: -1 
            }} 
          />
          
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5 mr-2">
              {styles.icon}
            </div>
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium">{message}</p>
            </div>
            <button 
              onClick={handleDismiss}
              className="ml-auto flex-shrink-0 -mt-1 -mr-1 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification; 