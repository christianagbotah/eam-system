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
 * Check if the notification service is available by hitting its health endpoint.
 * Uses the admin port (3005) to avoid socket.io 404 noise on the WS port.
 */
async function checkServiceHealth(): Promise<boolean> {
  try {
    const res = await fetch('/health?XTransformPort=3005', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * WebSocket hook — connects to the notification service (port 3004) via gateway.
 * Performs a pre-flight health check before connecting to avoid 404 spam.
 * Gracefully degrades when the service is unavailable.
 * Periodically re-checks health and connects when the service comes online.
 */
export function useWebSocket(): UseWebSocketReturn {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());
  const mountedRef = useRef(true);
  const healthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingRef = useRef(false);

  const connectSocket = useCallback((userId: string) => {
    if (connectingRef.current || socketRef.current?.connected) return;
    connectingRef.current = true;

    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!mountedRef.current) return;
      connectingRef.current = false;
      setConnected(true);
      socket.emit('auth', { userId });
      socket.emit('subscribe:notifications', userId);

      // Re-register all stored handlers
      for (const [event, handlers] of handlersRef.current) {
        for (const handler of handlers) {
          socket.on(event, handler);
        }
      }
    });

    socket.on('disconnect', () => {
      if (!mountedRef.current) return;
      setConnected(false);
    });

    socket.on('connect_error', () => {
      if (!mountedRef.current) return;
      connectingRef.current = false;
      // If we fail to connect, destroy socket and retry health check later
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    });
  }, []);

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      for (const [event, handlers] of handlersRef.current) {
        for (const handler of handlers) {
          socketRef.current!.off(event, handler);
        }
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    connectingRef.current = false;
    setConnected(false);
  }, []);

  // Main effect: health check + connection lifecycle
  useEffect(() => {
    mountedRef.current = true;

    if (!isAuthenticated || !user?.id) return;

    const userId = user.id;

    const tryConnect = async () => {
      if (!mountedRef.current) return;
      const healthy = await checkServiceHealth();
      if (!mountedRef.current) return;

      if (healthy) {
        connectSocket(userId);
      } else {
        // Service not available — schedule retry in 30s
        healthTimerRef.current = setTimeout(tryConnect, 30_000);
      }
    };

    tryConnect();

    return () => {
      mountedRef.current = false;
      if (healthTimerRef.current) {
        clearTimeout(healthTimerRef.current);
        healthTimerRef.current = null;
      }
      cleanupSocket();
    };
  }, [isAuthenticated, user?.id, connectSocket, cleanupSocket]);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);
    socketRef.current?.on(event, handler);
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