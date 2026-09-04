import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { OfflineSyncService } from '@/services/offlineSync.service';

const STORAGE_KEY = 'iassetspro_offline_queue';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

describe('OfflineSyncService cleanup', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes successfully synced records from local storage', () => {
    const synced = OfflineSyncService.queueOperation('create', 'work_order_comment', 'wo-1', { content: 'done' });
    const pending = OfflineSyncService.queueOperation('update', 'work_order_task', 'task-1', { status: 'completed' });

    OfflineSyncService.markSynced(synced.id);

    expect(OfflineSyncService.cleanup()).toBe(1);
    expect(OfflineSyncService.getPendingRecords().map(record => record.id)).toEqual([pending.id]);

    const persisted = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    expect(persisted).toHaveLength(1);
    expect(persisted[0].id).toBe(pending.id);
  });

  it('never drops unsynced records merely because they reached a high retry count', () => {
    const pending = OfflineSyncService.queueOperation('create', 'work_order_comment', 'wo-2', { content: 'field note' });

    for (let attempt = 0; attempt < 12; attempt += 1) {
      OfflineSyncService.markFailed(pending.id, `attempt-${attempt + 1}`);
    }

    expect(OfflineSyncService.cleanup()).toBe(0);

    const remaining = OfflineSyncService.getPendingRecords();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(pending.id);
    expect(remaining[0].syncAttempts).toBe(12);
    expect(remaining[0].lastError).toBe('attempt-12');
  });

  it('removes only synced records from a mixed queue', () => {
    const first = OfflineSyncService.queueOperation('create', 'work_order_comment', 'wo-3', { content: 'first' });
    const second = OfflineSyncService.queueOperation('create', 'work_order_comment', 'wo-3', { content: 'second' });
    const third = OfflineSyncService.queueOperation('delete', 'work_order_attachment', 'att-1', {});

    OfflineSyncService.markFailed(first.id, 'temporary network failure');
    OfflineSyncService.markSynced(second.id);
    OfflineSyncService.markSynced(third.id);

    expect(OfflineSyncService.cleanup()).toBe(2);
    expect(OfflineSyncService.getPendingRecords().map(record => record.id)).toEqual([first.id]);
  });
});
