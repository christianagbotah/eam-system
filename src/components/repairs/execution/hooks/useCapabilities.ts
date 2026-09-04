'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

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

export interface StartReadinessItem {
  code: string;
  category: string;
  message: string;
  severity: 'blocker' | 'warning';
}

export interface StartReadiness {
  ready: boolean;
  blockers: StartReadinessItem[];
  warnings: StartReadinessItem[];
}

interface CapabilitiesResult {
  capabilities: Capabilities | null;
  startReadiness: StartReadiness | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Apply the server-authoritative start-readiness result to the capability set.
 * Capabilities still determine who may start; readiness determines whether the
 * currently authorised user may start this work order right now.
 */
export function mergeStartReadiness(
  capabilities: Capabilities,
  readiness: StartReadiness | null,
): Capabilities {
  if (!capabilities.canStart || !readiness || readiness.ready) {
    return capabilities;
  }

  return { ...capabilities, canStart: false };
}

/**
 * Fetches server-authoritative capabilities for a work order and, whenever the
 * user is otherwise allowed to start, also checks phase=start readiness.
 *
 * Readiness failures fail open to the existing /start endpoint: a transient
 * read-only readiness request must not strand a technician, while the write
 * endpoint remains the final enforcement point. Confirmed blockers, however,
 * suppress Start immediately and are surfaced to the technician before any
 * execution request is made.
 */
export function useCapabilities(workOrderId: string | undefined): CapabilitiesResult {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [startReadiness, setStartReadiness] = useState<StartReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const readinessNoticeRef = useRef<string>('');

  const fetchCapabilities = useCallback(async () => {
    if (!workOrderId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/capabilities`);
      const json = await res.json();
      if (!mountedRef.current) return;

      if (!json.success) {
        setError(json.error || 'Failed to fetch capabilities');
        return;
      }

      const rawCapabilities = json.data as Capabilities;
      let readiness: StartReadiness | null = null;

      if (rawCapabilities.canStart) {
        try {
          const readinessRes = await fetch(
            `/api/work-orders/${workOrderId}/readiness?phase=start`,
            { cache: 'no-store' },
          );
          const readinessJson = await readinessRes.json();

          if (mountedRef.current && readinessJson.success && readinessJson.data) {
            readiness = readinessJson.data as StartReadiness;
            setStartReadiness(readiness);

            const blockerMessages = readiness.blockers.map((item) => item.message);
            const warningMessages = readiness.warnings.map((item) => item.message);
            const noticeSignature = JSON.stringify({ blockerMessages, warningMessages });

            if (noticeSignature !== readinessNoticeRef.current) {
              readinessNoticeRef.current = noticeSignature;

              if (blockerMessages.length > 0) {
                toast.error('Work is not ready to start', {
                  description: blockerMessages.join(' • '),
                  duration: 10_000,
                  id: `start-readiness-${workOrderId}`,
                });
              } else if (warningMessages.length > 0) {
                toast.warning('Start readiness warnings', {
                  description: warningMessages.join(' • '),
                  duration: 8_000,
                  id: `start-readiness-${workOrderId}`,
                });
              }
            }
          }
        } catch {
          // Advisory GET failed. Do not remove a capability solely because the
          // network/readiness read failed; POST /start remains authoritative.
          if (mountedRef.current) setStartReadiness(null);
        }
      } else {
        setStartReadiness(null);
        readinessNoticeRef.current = '';
      }

      if (mountedRef.current) {
        setCapabilities(mergeStartReadiness(rawCapabilities, readiness));
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
    setStartReadiness(null);
    setError(null);
    readinessNoticeRef.current = '';
    void fetchCapabilities();

    // Refresh unconditionally while the workspace is mounted. The previous
    // implementation closed over the initial capabilities=null value, so its
    // 30-second refresh never actually ran. Regular refresh also lets Start
    // reappear automatically after a blocker is resolved by another role.
    intervalRef.current = setInterval(() => {
      void fetchCapabilities();
    }, 30_000);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchCapabilities]);

  return { capabilities, startReadiness, isLoading, error };
}

export default useCapabilities;
