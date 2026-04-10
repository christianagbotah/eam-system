'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { wsClient, WebSocketEvent } from './client';
import { showToast } from '@/lib/toast';

interface WebSocketContextType {
  isConnected: boolean;
  status: 'connected' | 'disconnected' | 'connecting';
  subscribe: (event: WebSocketEvent, callback: (data: any) => void) => void;
  unsubscribe: (event: WebSocketEvent, callback: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
  enabled?: boolean;
}

export function WebSocketProvider({ 
  children, 
  url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  enabled = true 
}: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping WebSocket connection');
      return;
    }

    // Connect to WebSocket
    wsClient.connect(url, token);

    // Setup status monitoring
    const statusInterval = setInterval(() => {
      const currentStatus = wsClient.getConnectionStatus();
      setStatus(currentStatus);
      setIsConnected(currentStatus === 'connected');
    }, 1000);

    // Setup notification handler
    wsClient.on('notification', (data) => {
      showToast.info(data.title || 'Notification', data.message);
    });

    // Cleanup
    return () => {
      clearInterval(statusInterval);
      wsClient.disconnect();
    };
  }, [url, enabled]);

  const subscribe = (event: WebSocketEvent, callback: (data: any) => void) => {
    wsClient.on(event, callback);
  };

  const unsubscribe = (event: WebSocketEvent, callback: (data: any) => void) => {
    wsClient.off(event, callback);
  };

  const emit = (event: string, data: any) => {
    wsClient.emit(event, data);
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, status, subscribe, unsubscribe, emit }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Custom hook for subscribing to specific events
export function useWebSocketEvent(event: WebSocketEvent, callback: (data: any) => void) {
  const { subscribe, unsubscribe } = useWebSocketContext();

  useEffect(() => {
    subscribe(event, callback);
    return () => unsubscribe(event, callback);
  }, [event, callback, subscribe, unsubscribe]);
}
