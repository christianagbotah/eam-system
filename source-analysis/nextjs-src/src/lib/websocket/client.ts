// WebSocket Client for Real-time Updates
// This provides real-time notifications and data synchronization

import { io, Socket } from 'socket.io-client';

export type WebSocketEvent = 
  | 'work_order_updated'
  | 'work_order_created'
  | 'work_order_assigned'
  | 'asset_status_changed'
  | 'maintenance_request_created'
  | 'pm_schedule_due'
  | 'training_expiring'
  | 'calibration_due'
  | 'notification';

export interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  timestamp: string;
  userId?: number;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<WebSocketEvent, Set<(data: any) => void>> = new Map();

  constructor() {
    // Initialize listeners map
    this.initializeListeners();
  }

  private initializeListeners() {
    const events: WebSocketEvent[] = [
      'work_order_updated',
      'work_order_created',
      'work_order_assigned',
      'asset_status_changed',
      'maintenance_request_created',
      'pm_schedule_due',
      'training_expiring',
      'calibration_due',
      'notification'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  connect(url: string, token: string) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventHandlers();
      console.log('WebSocket connecting...');
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Setup event listeners for all events
    this.listeners.forEach((callbacks, event) => {
      this.socket?.on(event, (data: any) => {
        console.log(`📨 Received ${event}:`, data);
        callbacks.forEach(callback => callback(data));
      });
    });
  }

  on(event: WebSocketEvent, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.add(callback);
    }
  }

  off(event: WebSocketEvent, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();

// React Hook for WebSocket
export function useWebSocket() {
  return {
    connect: (url: string, token: string) => wsClient.connect(url, token),
    disconnect: () => wsClient.disconnect(),
    on: (event: WebSocketEvent, callback: (data: any) => void) => wsClient.on(event, callback),
    off: (event: WebSocketEvent, callback: (data: any) => void) => wsClient.off(event, callback),
    emit: (event: string, data: any) => wsClient.emit(event, data),
    isConnected: () => wsClient.isConnected(),
    getStatus: () => wsClient.getConnectionStatus(),
  };
}
