interface OfflineData {
  workOrders: any[];
  pendingSync: any[];
  lastSync: string;
}

export const offlineStorage = {
  save: (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`offline_${key}`, JSON.stringify(data));
    }
  },

  get: (key: string) => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(`offline_${key}`);
      return data ? JSON.parse(data) : null;
    }
    return null;
  },

  addPendingSync: (action: any) => {
    const pending = offlineStorage.get('pendingSync') || [];
    pending.push({ ...action, timestamp: new Date().toISOString() });
    offlineStorage.save('pendingSync', pending);
  },

  getPendingSync: () => {
    return offlineStorage.get('pendingSync') || [];
  },

  clearPendingSync: () => {
    offlineStorage.save('pendingSync', []);
  },

  isOnline: () => {
    return typeof window !== 'undefined' && navigator.onLine;
  }
};
