export class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(url: string = 'ws://localhost:8080') {
    this.ws = new WebSocket(url);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const handlers = this.listeners.get(data.type) || [];
      handlers.forEach(handler => handler(data.payload));
    };

    this.ws.onopen = () => console.log('WebSocket connected');
    this.ws.onerror = (error) => console.error('WebSocket error:', error);
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  emit(event: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: event, payload: data }));
    }
  }

  disconnect() {
    this.ws?.close();
  }
}

export const wsManager = new WebSocketManager();
