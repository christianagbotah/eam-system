'use client';

import { useState, useEffect } from 'react';
import { maintenanceService } from '@/services/maintenanceService';

interface SlaTracking {
  id: number;
  work_order_id: number;
  target_response_time: string;
  target_resolution_time: string;
  response_breached: boolean;
  resolution_breached: boolean;
  current_escalation_level: number;
}

export default function SlaDashboard() {
  const [breached, setBreached] = useState<SlaTracking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBreachedSlas();
  }, []);

  const loadBreachedSlas = async () => {
    try {
      const res = await maintenanceService.getBreachedSlas();
      setBreached(res.data.data || []);
    } catch (error) {
      console.error('Failed to load breached SLAs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading SLA data...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">SLA Compliance Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="text-3xl font-bold text-red-600">{breached.length}</div>
          <div className="text-sm text-gray-600">Breached SLAs</div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <div className="text-3xl font-bold text-yellow-600">
            {breached.filter(s => s.current_escalation_level > 0).length}
          </div>
          <div className="text-sm text-gray-600">Escalated</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">
            {breached.filter(s => s.response_breached && !s.resolution_breached).length}
          </div>
          <div className="text-sm text-gray-600">Response Only</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Breached Work Orders</h3>
        {breached.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✓</div>
            <div>No SLA breaches - Excellent performance!</div>
          </div>
        ) : (
          breached.map((sla) => (
            <div key={sla.id} className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">Work Order #{sla.work_order_id}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {sla.response_breached && <span className="text-red-600">Response breached</span>}
                    {sla.response_breached && sla.resolution_breached && ' • '}
                    {sla.resolution_breached && <span className="text-red-600">Resolution breached</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Target: {new Date(sla.target_resolution_time).toLocaleString()}
                  </div>
                </div>
                {sla.current_escalation_level > 0 && (
                  <span className="px-3 py-1 bg-red-600 text-white text-sm rounded">
                    Level {sla.current_escalation_level}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
