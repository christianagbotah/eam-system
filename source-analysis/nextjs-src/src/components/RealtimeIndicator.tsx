'use client';

import { useWebSocketContext } from '@/lib/websocket/WebSocketProvider';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function RealtimeIndicator() {
  const { isConnected, status } = useWebSocketContext();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Real-time updates active';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Real-time updates offline';
      default:
        return 'Unknown status';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isConnected ? 'animate-pulse' : ''}`} />
      <div className="flex items-center gap-1.5 text-white/90">
        {getIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
      </div>
    </div>
  );
}
