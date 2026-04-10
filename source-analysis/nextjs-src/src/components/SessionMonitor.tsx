'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tokenManager } from '@/lib/tokenManager';

/**
 * Enterprise Session Monitor
 * Monitors session health and refreshes tokens automatically
 */
export function SessionMonitor() {
  const { user, refreshSession } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Check session every 5 minutes
    const sessionCheckInterval = setInterval(async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error('Session check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Refresh on user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    let lastActivity = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Only refresh if more than 5 minutes since last activity
      if (now - lastActivity > 5 * 60 * 1000) {
        lastActivity = now;
        refreshSession().catch(console.error);
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      clearInterval(sessionCheckInterval);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, refreshSession]);

  return null; // This component doesn't render anything
}
