'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface Capabilities {
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canLogOwnTime: boolean;
  canLogTeamTime: boolean;
  canRequestTools: boolean;
  canRequestMaterials: boolean;
  canRequestAssistance: boolean;
  canHandover: boolean;
  canSubmitCompletion: boolean;
  canVerify: boolean;
  canClose: boolean;
  isTeamLeader: boolean;
  isTeamMember: boolean;
  isSupervisor: boolean;
  isPlanner: boolean;
  isAdmin: boolean;
}

interface CapabilitiesResult {
  capabilities: Capabilities | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches server-authoritative capabilities for a work order.
 * Auto-refetches on a 30-second interval while the WO is in an active state.
 */
export function useCapabilities(workOrderId: string | undefined): CapabilitiesResult {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchCapabilities = useCallback(async () => {
    if (!workOrderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/capabilities`);
      const json = await res.json();
      if (!mountedRef.current) return;
      if (json.success) {
        setCapabilities(json.data as Capabilities);
      } else {
        setError(json.error || 'Failed to fetch capabilities');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    mountedRef.current = true;
    setCapabilities(null);
    setError(null);
    fetchCapabilities();

    // Auto-refetch every 30 seconds if capabilities indicate an active state
    intervalRef.current = setInterval(() => {
      if (capabilities) {
        const isActive =
          capabilities.canStart ||
          capabilities.canPause ||
          capabilities.canResume ||
          capabilities.canSubmitCompletion;
        if (isActive) {
          fetchCapabilities();
        }
      }
    }, 30_000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchCapabilities]);

  return { capabilities, isLoading, error };
}

export default useCapabilities;
