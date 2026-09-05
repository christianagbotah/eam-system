import { createHash } from 'crypto';

export interface OfflineReplayRecord {
  entityType: string;
  entityId: string;
  operation: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface StoredOfflineReplay {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  responseData: string | null;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function buildOfflineRequestHash(record: OfflineReplayRecord): string {
  return sha256(JSON.stringify(canonicalize({
    entityType: record.entityType,
    entityId: record.entityId,
    operation: record.operation,
    data: record.data,
    timestamp: record.timestamp,
  })));
}

export function readStoredOfflineRequestHash(responseData: string | null): string | null {
  if (!responseData) return null;
  try {
    const parsed = JSON.parse(responseData) as { requestHash?: unknown };
    return typeof parsed.requestHash === 'string' && parsed.requestHash.length > 0
      ? parsed.requestHash
      : null;
  } catch {
    return null;
  }
}

export function isOfflineReplayMatch(
  existing: StoredOfflineReplay,
  record: OfflineReplayRecord,
  userId: string,
): boolean {
  if (existing.userId !== userId) return false;
  if (existing.entityType !== record.entityType) return false;
  if (existing.entityId !== record.entityId) return false;
  if (existing.action !== record.operation) return false;

  const storedRequestHash = readStoredOfflineRequestHash(existing.responseData);
  if (!storedRequestHash) {
    // Backward compatibility for rows created before request hashes were stored.
    // Identity, entity and action still have to match exactly.
    return true;
  }

  return storedRequestHash === buildOfflineRequestHash(record);
}
