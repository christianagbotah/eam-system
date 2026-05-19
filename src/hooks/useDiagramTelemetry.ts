'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TelemetrySnapshot } from '@/services/diagramTelemetry.service';

interface UseDiagramTelemetryOptions {
  diagramId: string | null;
  enabled?: boolean;
  refreshInterval?: number; // ms
}

interface UseDiagramTelemetryReturn {
  snapshots: TelemetrySnapshot[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => void;
  alarmCount: number;
}

export function useDiagramTelemetry({
  diagramId,
  enabled = true,
  refreshInterval = 5000,
}: UseDiagramTelemetryOptions): UseDiagramTelemetryReturn {
  const [snapshots, setSnapshots] = useState<TelemetrySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!diagramId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/telemetry/overlay?diagramId=${diagramId}`);
      if (!res.ok) throw new Error('Failed to fetch telemetry');

      const data = await res.json();
      if (data.success) {
        setSnapshots(data.data?.snapshots || []);
        setLastUpdated(new Date().toISOString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [diagramId, enabled]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || !diagramId) return;

    fetchSnapshots();
    intervalRef.current = setInterval(fetchSnapshots, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSnapshots, refreshInterval, enabled, diagramId]);

  // Alarm count from snapshots
  const alarmCount = snapshots.filter(s => s.quality !== 'good').length;

  return {
    snapshots,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchSnapshots,
    alarmCount,
  };
}
