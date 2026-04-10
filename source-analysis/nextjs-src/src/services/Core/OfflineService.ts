interface OfflineAction {
  id: string;
  type: 'STATUS_UPDATE' | 'PHOTO_UPLOAD' | 'VOICE_NOTE' | 'BARCODE_SCAN';
  workOrderId: string;
  data: any;
  timestamp: string;
  userId: number;
  deviceInfo: string;
  synced: boolean;
}

export class OfflineService {
  private storageKey = 'rwop_offline_queue';
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Queue action for offline execution
   */
  queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): string {
    const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedAction: OfflineAction = {
      ...action,
      id: actionId,
      timestamp: new Date().toISOString(),
      synced: false
    };

    const queue = this.getQueue();
    queue.push(queuedAction);
    localStorage.setItem(this.storageKey, JSON.stringify(queue));

    if (this.isOnline) {
      this.syncAction(queuedAction);
    }

    return actionId;
  }

  /**
   * Sync pending actions when online
   */
  async syncPendingActions(): Promise<void> {
    const queue = this.getQueue();
    const pending = queue.filter(action => !action.synced);

    for (const action of pending) {
      await this.syncAction(action);
    }
  }

  /**
   * Sync individual action
   */
  private async syncAction(action: OfflineAction): Promise<void> {
    try {
      const response = await fetch('/api/v1/eam/rwop/mobile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      if (response.ok) {
        this.markSynced(action.id);
      }
    } catch (error) {
      console.error('Sync failed for action:', action.id, error);
    }
  }

  /**
   * Mark action as synced
   */
  private markSynced(actionId: string): void {
    const queue = this.getQueue();
    const actionIndex = queue.findIndex(a => a.id === actionId);
    if (actionIndex !== -1) {
      queue[actionIndex].synced = true;
      localStorage.setItem(this.storageKey, JSON.stringify(queue));
    }
  }

  /**
   * Get offline queue
   */
  private getQueue(): OfflineAction[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get pending actions count
   */
  getPendingCount(): number {
    return this.getQueue().filter(action => !action.synced).length;
  }

  /**
   * Clear synced actions (cleanup)
   */
  clearSynced(): void {
    const queue = this.getQueue();
    const pending = queue.filter(action => !action.synced);
    localStorage.setItem(this.storageKey, JSON.stringify(pending));
  }
}

export default new OfflineService();