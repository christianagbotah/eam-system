'use client';

import { useState, useEffect } from 'react';
import { Camera, Clock, CheckCircle, Package, MapPin, Wifi, WifiOff, Upload, RefreshCw } from 'lucide-react';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

function MobileWorkOrderContent() {
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [photos, setPhotos] = useState<any[]>([]);
  const [timeLog, setTimeLog] = useState({ activity: 'repair', notes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrders();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const technicianId = 1; // Get from auth context
      const res = await api.get(`/mobile/work-orders/assigned/${technicianId}`);
      if (res.data?.status === 'success') {
        setWorkOrders(res.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const startWork = async (wo: any) => {
    try {
      const res = await api.post(`/mobile/work-orders/${wo.id}/start`, {});
      if (res.data?.status === 'success') {
        showToast.success('Work started');
        setSelectedWO({...wo, status: 'in_progress'});
        fetchWorkOrders();
      }
    } catch (error) {
      showToast.error('Failed to start work');
    }
  };

  const completeWork = async () => {
    if (!selectedWO) return;
    try {
      const res = await api.post(`/mobile/work-orders/${selectedWO.id}/complete`, { notes: timeLog.notes, activity: timeLog.activity });
      if (res.data?.status === 'success') {
        showToast.success('Work completed');
        setSelectedWO(null);
        setTimeLog({ activity: 'repair', notes: '' });
        setPhotos([]);
        fetchWorkOrders();
      }
    } catch (error) {
      showToast.error('Failed to complete work');
    }
  };

  const capturePhoto = () => {
    setPhotos([...photos, { id: photos.length + 1, type: 'during', timestamp: new Date().toISOString() }]);
    showToast.success('Photo captured');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-4"><div className="max-w-4xl mx-auto"><TableSkeleton rows={5} /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">My Work Orders</h1>
            <p className="text-gray-600">Mobile execution</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchWorkOrders} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {!selectedWO ? (
          <div className="space-y-3">
            {workOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">No work orders assigned</div>
            ) : (
            workOrders.map((wo: any) => (
              <div key={wo.id} className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: wo.priority === 'high' ? '#ef4444' : wo.priority === 'medium' ? '#f59e0b' : '#10b981' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono text-sm text-gray-600">{wo.wo_number || `WO-${wo.id}`}</div>
                    <h3 className="font-bold text-lg">{wo.title || wo.description}</h3>
                    <div className="text-sm text-xs text-gray-600 mt-0.5">{wo.asset_name || wo.asset}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${wo.priority === 'high' ? 'bg-red-100 text-red-800' : wo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{wo.priority?.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className={`px-2 py-1 rounded text-xs ${wo.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : wo.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{wo.status?.replace('_', ' ').toUpperCase()}</span>
                  {wo.status === 'assigned' && (
                    <button onClick={() => startWork(wo)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md text-sm">Start Work</button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button onClick={() => setSelectedWO(wo)} className="px-2 py-1 text-xs bg-green-600 text-white rounded-md text-sm">Continue</button>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-mono text-sm text-gray-600">{selectedWO.wo_number || `WO-${selectedWO.id}`}</div>
                  <h2 className="text-xl font-bold">{selectedWO.title || selectedWO.description}</h2>
                </div>
                <button onClick={() => setSelectedWO(null)} className="text-gray-600">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={capturePhoto} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50">
                  <Camera className="w-8 h-8 text-blue-600" />
                  <span className="text-sm font-medium">Take Photo</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50">
                  <Clock className="w-8 h-8 text-green-600" />
                  <span className="text-sm font-medium">Log Time</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50">
                  <Package className="w-8 h-8 text-orange-600" />
                  <span className="text-sm font-medium">Scan Part</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50">
                  <MapPin className="w-8 h-8 text-purple-600" />
                  <span className="text-sm font-medium">Location</span>
                </button>
              </div>

              {photos.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Photos ({photos.length})</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(photo => (
                      <div key={photo.id} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Activity Type</label>
                <select value={timeLog.activity} onChange={(e) => setTimeLog({ ...timeLog, activity: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="travel">Travel</option>
                  <option value="diagnosis">Diagnosis</option>
                  <option value="repair">Repair</option>
                  <option value="testing">Testing</option>
                  <option value="documentation">Documentation</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Completion Notes</label>
                <textarea value={timeLog.notes} onChange={(e) => setTimeLog({ ...timeLog, notes: e.target.value })} rows={4} className="w-full border rounded-lg px-3 py-2" placeholder="Describe work performed..."></textarea>
              </div>

              <div className="flex gap-2">
                <button onClick={completeWork} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />Complete Work
                </button>
                {!isOnline && (
                  <button className="px-4 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                    <Upload className="w-4 h-4" />Queue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <WifiOff className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-900">Offline Mode</div>
                <div className="text-sm text-yellow-700 mt-1">Changes will sync when connection is restored.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileWorkOrderPage() {
  return (
    <RBACGuard module="mobile_work_orders" action="view">
      <MobileWorkOrderContent />
    </RBACGuard>
  );
}
