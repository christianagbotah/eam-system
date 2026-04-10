'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import WorkOrderTeamAssignment from '@/components/WorkOrderTeamAssignment';

export default function SupervisorQueuePage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState<number | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const res = await api.get('/work-order-team/supervisor/queue');
      setWorkOrders(res.data?.data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">My Work Order Queue</h1>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : workOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No work orders assigned to you
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Forwarded</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium">{wo.wo_number}</td>
                  <td className="px-3 py-2.5 text-sm">{wo.title}</td>
                  <td className="px-3 py-2.5 text-sm">{wo.asset_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      wo.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                    {new Date(wo.forwarded_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => router.push(`/work-orders/${wo.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setSelectedWO(wo.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Assign Team
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedWO && (
        <WorkOrderTeamAssignment
          workOrderId={selectedWO}
          onClose={() => setSelectedWO(null)}
          onSuccess={() => {
            setSelectedWO(null);
            loadQueue();
          }}
        />
      )}
    </div>
  );
}
