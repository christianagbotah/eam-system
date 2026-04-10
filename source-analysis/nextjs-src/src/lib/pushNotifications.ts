export const pushNotifications = {
  requestPermission: async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  sendNotification: (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options
      });
    }
  },

  subscribeToWorkOrders: async (userId: number) => {
    const granted = await pushNotifications.requestPermission();
    if (granted) {
      localStorage.setItem('push_notifications_enabled', 'true');
      localStorage.setItem('push_user_id', userId.toString());
    }
    return granted;
  },

  isEnabled: () => {
    return localStorage.getItem('push_notifications_enabled') === 'true';
  }
};
