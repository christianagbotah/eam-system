'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState('');

  useEffect(() => {
    fetchWorkOrder();
  }, [params.id]);

  const fetchWorkOrder = async () => {
    try {
      const response = await api.get(`/pm-work-orders/${params.id}`);
      const data = response.data;
      setWo(data.data);
    } catch (error) {
      showToast.error('Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const assignTechnician = async () => {
    if (!technicianId) {
      showToast.error('Please enter technician ID');
      return;
    }

    const loadingToast = showToast.loading('Assigning technician...');
    try {
      const response = await api.post(`/pm-work-orders/${params.id}/assign`),
        body: JSON.stringify({ technician_id: technicianId })
      });
      const data = response.data;
      showToast.dismiss(loadingToast);
      showToast.success(data.message);
      fetchWorkOrder();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to assign technician');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!wo) return <div className="p-6">Work order not found</div>;

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Work Orders
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">{wo.work_order_number}</h1>
            <p className="text-gray-600">{wo.part_name} - {wo.part_number}</p>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
            wo.status === 'completed' ? 'bg-green-100 text-green-800' :
            wo.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            wo.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {wo.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Task Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Title:</span>
                <span className="font-medium">{wo.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Priority:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  wo.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {wo.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-medium">{new Date(wo.scheduled_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">{new Date(wo.due_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Duration:</span>
                <span className="font-medium">{wo.estimated_duration}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Assignment</h3>
            {wo.status === 'pending' ? (
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Technician ID"
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <button
                  onClick={assignTechnician}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Assign Technician
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned To:</span>
                  <span className="font-medium">Technician #{wo.assigned_to}</span>
                </div>
                {wo.assigned_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assigned At:</span>
                    <span className="font-medium">{new Date(wo.assigned_at).toLocaleString('en-GB')}</span>
                  </div>
                )}
                {wo.started_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started At:</span>
                    <span className="font-medium">{new Date(wo.started_at).toLocaleString('en-GB')}</span>
                  </div>
                )}
                {wo.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed At:</span>
                    <span className="font-medium">{new Date(wo.completed_at).toLocaleString('en-GB')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {wo.description && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700">{wo.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Checklist ({wo.checklist?.filter((i: any) => i.is_completed).length || 0}/{wo.checklist?.length || 0})</h3>
            <div className="space-y-2">
              {wo.checklist?.map((item: any) => (
                <div key={item.id} className={`p-3 rounded-lg border ${item.is_completed ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      disabled
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : ''}`}>
                        {item.item_description}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-gray-600 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Execution Parameters ({wo.parameters?.length || 0})</h3>
            <div className="space-y-2">
              {wo.parameters?.length === 0 ? (
                <p className="text-sm text-gray-500">No parameters recorded yet</p>
              ) : (
                wo.parameters?.map((param: any) => (
                  <div key={param.id} className="p-3 rounded-lg bg-gray-50 border">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{param.parameter_name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        param.status === 'critical' ? 'bg-red-100 text-red-800' :
                        param.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {param.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{param.parameter_value}</span>
                      {param.parameter_unit && <span className="text-gray-500"> {param.parameter_unit}</span>}
                      {param.expected_value && (
                        <span className="text-gray-500"> (Expected: {param.expected_value})</span>
                      )}
                    </div>
                    {param.notes && (
                      <p className="text-xs text-gray-600 mt-1">{param.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
