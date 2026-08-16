'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineSyncService, type SyncRecord } from '@/services/offlineSync.service';
import { api } from '@/lib/api';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useOfflineSync');

export type OfflineStatus = 'online' | 'offline' | 'pending_sync' | 'sync_failed';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingCount: number;
  syncInProgress: boolean;
  lastError: string | null;
  syncNow: () => Promise<void>;
  status: OfflineStatus;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);

  // Refresh pending count from the OfflineSyncService
  const refreshPendingCount = useCallback(() => {
    try {
      const count = OfflineSyncService.getPendingRecords().length;
      setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      logger.info('Device came online');
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      logger.info('Device went offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll pending count periodically (every 5 seconds)
    const interval = setInterval(refreshPendingCount, 5000);

    // Initial count
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  // Sync function
  const syncNow = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) return;

    const records = OfflineSyncService.getPendingRecords();
    if (records.length === 0) {
      refreshPendingCount();
      return;
    }

    syncInProgressRef.current = true;
    setSyncInProgress(true);
    setLastError(null);

    try {
      const res = await api.post<{ results: Array<{ id: string; success: boolean; error?: string }> }>(
        '/api/sync/offline',
        { records },
        { timeout: 30_000 },
      );

      if (res.success && res.data?.results) {
        let hasFailure = false;
        for (const result of res.data.results) {
          if (result.success) {
            OfflineSyncService.markSynced(result.id);
          } else {
            OfflineSyncService.markFailed(result.id, result.error || 'Sync failed');
            hasFailure = true;
          }
        }

        if (hasFailure) {
          setLastError('Some records failed to sync');
        }
      } else {
        // API call itself failed — mark all as failed
        const errorMsg = res.error || 'Sync request failed';
        setLastError(errorMsg);
        for (const record of records) {
          OfflineSyncService.markFailed(record.id, errorMsg);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error during sync';
      setLastError(errorMsg);
      logger.error('Sync failed', { error: errorMsg });
      // Don't mark as failed — it's a network issue, will retry when back online
    } finally {
      syncInProgressRef.current = false;
      setSyncInProgress(false);
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  // Derive composite status
  const status: OfflineStatus = (() => {
    if (syncInProgress) return 'pending_sync';
    if (lastError && pendingCount > 0) return 'sync_failed';
    if (!isOnline) return 'offline';
    return 'online';
  })();

  return {
    isOnline,
    pendingCount,
    syncInProgress,
    lastError,
    syncNow,
    status,
  };
}
