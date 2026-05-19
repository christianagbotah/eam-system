'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

interface UseWebSocketReturn {
  connected: boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

/**
 * WebSocket hook — connects to the notification service (port 3004) via gateway.
 * Gracefully degrades when the service is unavailable (no noisy console errors).
 */
export function useWebSocket(): UseWebSocketReturn {
  const { user, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());
  const errorCountRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Connect to WS service via gateway
    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id);
      setConnected(true);
      errorCountRef.current = 0;
      socket.emit('auth', { userId: user.id });
      socket.emit('subscribe:notifications', user.id);

      // Re-register all stored handlers
      for (const [event, handlers] of handlersRef.current) {
        for (const handler of handlers) {
          socket.on(event, handler);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      // Don't log transport-level disconnects — they're noisy
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      errorCountRef.current++;
      // Only log first 2 errors to avoid spamming console during reconnection attempts
      if (errorCountRef.current <= 2) {
        console.warn('[WS] Notification service unavailable — real-time features disabled');
      }
      setConnected(false);
    });

    socket.on('auth:success', () => {
      console.log('[WS] Authenticated');
    });

    return () => {
      // Clean up all handlers
      for (const [event, handlers] of handlersRef.current) {
        for (const handler of handlers) {
          socket.off(event, handler);
        }
      }
      handlersRef.current.clear();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    // Store the handler for re-registration on reconnect
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    // Register immediately if socket is connected
    socketRef.current?.on(event, handler);

    // Return cleanup function
    return () => {
      handlersRef.current.get(event)?.delete(handler);
      if (handlersRef.current.get(event)?.size === 0) {
        handlersRef.current.delete(event);
      }
      socketRef.current?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      handlersRef.current.get(event)?.delete(handler);
      socketRef.current?.off(event, handler);
    } else {
      handlersRef.current.delete(event);
      socketRef.current?.removeAllListeners(event);
    }
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return { connected, on, off, emit };
}
