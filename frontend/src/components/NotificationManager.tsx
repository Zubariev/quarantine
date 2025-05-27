import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Notification, { NotificationType } from './Notification';
import useGameStore from 'utils/gameStore';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

// Create a singleton pattern for notifications
let notificationCounter = 0;
let addNotificationHandler: ((notification: Omit<NotificationItem, 'id'>) => void) | null = null;

// Function to add notifications from anywhere in the app
export const showNotification = (
  message: string,
  type: NotificationType = 'info',
  duration = 5000
) => {
  if (addNotificationHandler) {
    addNotificationHandler({ message, type, duration });
  }
};

const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  
  // Get game stats for monitoring
  const { stats } = useGameStore();
  
  // Register the add notification handler
  const handleAddNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const id = `notification-${++notificationCounter}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);
  
  // Handle notification dismissal
  const handleDismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Set up the portal element and notification handler
  useEffect(() => {
    // Ensure we have a portal element
    let element = document.getElementById('notification-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'notification-portal';
      document.body.appendChild(element);
    }
    setPortalElement(element);
    
    // Set the global add notification handler
    addNotificationHandler = handleAddNotification;
    
    return () => {
      // Clean up the portal element when component unmounts
      addNotificationHandler = null;
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, [handleAddNotification]);
  
  // Monitor stats for critical thresholds
  useEffect(() => {
    // Check hunger
    if (stats.hunger < 20) {
      handleAddNotification({
        message: 'You are very hungry! Get some food soon.',
        type: 'warning',
        duration: 6000,
      });
    }
    
    // Check stress
    if (stats.stress > 80) {
      handleAddNotification({
        message: 'Stress levels critical! Take a break or meditate.',
        type: 'critical',
        duration: 8000,
      });
    }
    
    // Check energy/tone
    if (stats.tone < 20) {
      handleAddNotification({
        message: 'Energy levels very low! Rest is needed.',
        type: 'warning',
        duration: 6000,
      });
    }
    
    // Check health
    if (stats.health < 30) {
      handleAddNotification({
        message: 'Health declining! Take care of yourself.',
        type: 'critical',
        duration: 8000,
      });
    }
    
    // Check money
    if (stats.money < 10) {
      handleAddNotification({
        message: 'Almost out of money! Time to work.',
        type: 'critical',
        duration: 8000,
      });
    }
  }, [stats, handleAddNotification]);
  
  if (!portalElement) return null;
  
  return createPortal(
    <div className="fixed top-20 left-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Notification
            id={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onDismiss={handleDismissNotification}
          />
        </div>
      ))}
    </div>,
    portalElement
  );
};

export default NotificationManager; 