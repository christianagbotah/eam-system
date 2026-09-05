import { describe, expect, it } from 'vitest';
import {
  buildOfflineRequestHash,
  isOfflineReplayMatch,
  readStoredOfflineRequestHash,
  type OfflineReplayRecord,
} from '@/lib/offline-idempotency';

function record(overrides: Partial<OfflineReplayRecord> = {}): OfflineReplayRecord {
  return {
    entityType: 'work_order_comment',
    entityId: 'wo-1',
    operation: 'create',
    data: { content: 'Bearing inspected', nested: { b: 2, a: 1 } },
    timestamp: '2026-09-04T10:00:00.000Z',
    ...overrides,
  };
}

function stored(recordValue: OfflineReplayRecord, overrides: Partial<{
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  responseData: string | null;
}> = {}) {
  return {
    userId: 'tech-1',
    entityType: recordValue.entityType,
    entityId: recordValue.entityId,
    action: recordValue.operation,
    responseData: JSON.stringify({
      success: true,
      requestHash: buildOfflineRequestHash(recordValue),
    }),
    ...overrides,
  };
}

describe('offline idempotency replay matching', () => {
  it('accepts an exact replay from the same user', () => {
    const queued = record();
    expect(isOfflineReplayMatch(stored(queued), queued, 'tech-1')).toBe(true);
  });

  it('rejects reuse of another user\'s idempotency key', () => {
    const queued = record();
    expect(isOfflineReplayMatch(stored(queued, { userId: 'tech-2' }), queued, 'tech-1')).toBe(false);
  });

  it('rejects a key reused for a different work order or operation', () => {
    const queued = record();
    expect(isOfflineReplayMatch(stored(queued, { entityId: 'wo-2' }), queued, 'tech-1')).toBe(false);
    expect(isOfflineReplayMatch(stored(queued, { action: 'update' }), queued, 'tech-1')).toBe(false);
  });

  it('rejects a key reused with a changed payload', () => {
    const original = record();
    const changed = record({ data: { content: 'Different comment' } });
    expect(isOfflineReplayMatch(stored(original), changed, 'tech-1')).toBe(false);
  });

  it('canonicalizes object key order before hashing', () => {
    const first = record({ data: { z: 1, nested: { b: 2, a: 1 } } });
    const second = record({ data: { nested: { a: 1, b: 2 }, z: 1 } });
    expect(buildOfflineRequestHash(first)).toBe(buildOfflineRequestHash(second));
  });

  it('allows legacy rows only when user/entity/action metadata still matches', () => {
    const queued = record();
    const legacy = stored(queued, { responseData: JSON.stringify({ success: true }) });
    expect(readStoredOfflineRequestHash(legacy.responseData)).toBeNull();
    expect(isOfflineReplayMatch(legacy, queued, 'tech-1')).toBe(true);
    expect(isOfflineReplayMatch({ ...legacy, userId: 'tech-2' }, queued, 'tech-1')).toBe(false);
  });
});
