'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Clock, AlertTriangle, Camera, Mic, QrCode, Wifi, WifiOff } from 'lucide-react';
import OfflineService from '@/services/Core/OfflineService';
import { useAuth } from '@/hooks/useAuth';

interface MobileWorkOrder {
  id: string;
  woNumber: string;
  assetName: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  slaMinutesRemaining: number;
  assignedTeam: string[];
  shift: string;
}

export default function MobileTechnicianView() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<MobileWorkOrder[]>([]);
  const [selectedWO, setSelectedWO] = useState<MobileWorkOrder | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update pending sync count
    const interval = setInterval(() => {
      setPendingSync(OfflineService.getPendingCount());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleStatusUpdate = (status: string) => {
    if (!selectedWO || !user?.id) return;

    OfflineService.queueAction({
      type: 'STATUS_UPDATE',
      workOrderId: selectedWO.id,
      data: { status, timestamp: new Date().toISOString() },
      userId: user.id,
      deviceInfo: navigator.userAgent
    });

    // Update local state optimistically
    setSelectedWO(prev => prev ? { ...prev, status } : null);
  };

  const handlePhotoCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && selectedWO && user?.id) {
        const reader = new FileReader();
        reader.onload = () => {
          OfflineService.queueAction({
            type: 'PHOTO_UPLOAD',
            workOrderId: selectedWO.id,
            data: { 
              image: reader.result,
              filename: file.name,
              size: file.size
            },
            userId: user.id,
            deviceInfo: navigator.userAgent
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getSLAColor = (minutes: number) => {
    if (minutes < 0) return 'text-red-600';
    if (minutes < 30) return 'text-orange-600';
    return 'text-green-600';
  };

  if (!selectedWO) {
    return (
      <div className=\"min-h-screen bg-gray-100 p-4\">
        {/* Header */}
        <div className=\"bg-white rounded-lg p-4 mb-4 shadow-sm\">
          <div className=\"flex items-center justify-between\">
            <h1 className=\"text-xl font-bold\">My Work Orders</h1>
            <div className=\"flex items-center gap-2\">
              {isOnline ? (
                <Wifi className=\"w-5 h-5 text-green-600\" />
              ) : (
                <WifiOff className=\"w-5 h-5 text-red-600\" />
              )}
              {pendingSync > 0 && (
                <span className=\"bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs\">
                  {pendingSync} pending
                </span>
              )}
            </div>
          </div>
          <p className=\"text-sm text-gray-600\">Shift: {user?.shift || 'Day'}</p>
        </div>

        {/* Work Orders List */}
        <div className=\"space-y-3\">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              onClick={() => setSelectedWO(wo)}
              className=\"bg-white rounded-lg p-4 shadow-sm active:bg-gray-50\"
            >
              <div className=\"flex items-start justify-between mb-2\">
                <div className=\"flex items-center gap-2\">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(wo.priority)}`}></div>
                  <span className=\"font-semibold\">{wo.woNumber}</span>
                </div>
                <span className={`text-sm font-medium ${getSLAColor(wo.slaMinutesRemaining)}`}>
                  {wo.slaMinutesRemaining > 0 ? `${wo.slaMinutesRemaining}m` : 'OVERDUE'}
                </span>
              </div>
              <h3 className=\"font-medium text-gray-900 mb-1\">{wo.assetName}</h3>
              <p className=\"text-sm text-gray-600 mb-2 line-clamp-2\">{wo.description}</p>
              <div className=\"flex items-center justify-between text-xs text-gray-500\">
                <span>Status: {wo.status}</span>
                <span>Team: {wo.assignedTeam.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-100\">
      {/* Header */}
      <div className=\"bg-white p-4 shadow-sm\">
        <button
          onClick={() => setSelectedWO(null)}
          className=\"text-blue-600 text-sm mb-2\"
        >
          ← Back to List
        </button>
        <div className=\"flex items-center justify-between\">
          <div>
            <h1 className=\"text-lg font-bold\">{selectedWO.woNumber}</h1>
            <p className=\"text-sm text-gray-600\">{selectedWO.assetName}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-white text-sm ${getPriorityColor(selectedWO.priority)}`}>
            {selectedWO.priority.toUpperCase()}
          </div>
        </div>
      </div>

      {/* SLA Timer */}
      <div className=\"bg-white mx-4 mt-4 p-4 rounded-lg shadow-sm\">
        <div className=\"flex items-center justify-between\">
          <div className=\"flex items-center gap-2\">
            <Clock className=\"w-5 h-5 text-gray-600\" />
            <span className=\"font-medium\">SLA Timer</span>
          </div>
          <span className={`text-lg font-bold ${getSLAColor(selectedWO.slaMinutesRemaining)}`}>
            {selectedWO.slaMinutesRemaining > 0 
              ? `${Math.floor(selectedWO.slaMinutesRemaining / 60)}:${(selectedWO.slaMinutesRemaining % 60).toString().padStart(2, '0')}`
              : 'OVERDUE'
            }
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className=\"p-4\">
        <h3 className=\"font-medium mb-3\">Quick Actions</h3>
        <div className=\"grid grid-cols-2 gap-3 mb-4\">
          <button
            onClick={() => handleStatusUpdate('in_progress')}
            className=\"bg-green-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 active:bg-green-700\"
          >
            <Play className=\"w-5 h-5\" />
            Start Work
          </button>
          <button
            onClick={() => handleStatusUpdate('paused')}
            className=\"bg-yellow-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 active:bg-yellow-700\"
          >
            <Pause className=\"w-5 h-5\" />
            Pause
          </button>
          <button
            onClick={() => handleStatusUpdate('waiting_parts')}
            className=\"bg-orange-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 active:bg-orange-700\"
          >
            <AlertTriangle className=\"w-5 h-5\" />
            Waiting Parts
          </button>
          <button
            onClick={() => handleStatusUpdate('completed')}
            className=\"bg-blue-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 active:bg-blue-700\"
          >
            ✓ Complete
          </button>
        </div>

        {/* Evidence Capture */}
        <h3 className=\"font-medium mb-3\">Evidence Capture</h3>
        <div className=\"grid grid-cols-3 gap-3\">
          <button
            onClick={handlePhotoCapture}
            className=\"bg-gray-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 active:bg-gray-700\"
          >
            <Camera className=\"w-6 h-6\" />
            <span className=\"text-xs\">Photo</span>
          </button>
          <button className=\"bg-gray-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 active:bg-gray-700\">
            <Mic className=\"w-6 h-6\" />
            <span className=\"text-xs\">Voice</span>
          </button>
          <button className=\"bg-gray-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 active:bg-gray-700\">
            <QrCode className=\"w-6 h-6\" />
            <span className=\"text-xs\">Scan</span>
          </button>
        </div>
      </div>

      {/* Work Description */}
      <div className=\"bg-white mx-4 mb-4 p-4 rounded-lg shadow-sm\">
        <h3 className=\"font-medium mb-2\">Work Description</h3>
        <p className=\"text-sm text-gray-700\">{selectedWO.description}</p>
      </div>
    </div>
  );
}