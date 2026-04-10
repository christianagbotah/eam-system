'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function MaintenanceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/maintenance-orders/${orderId}`);
      const result = response.data;
      setOrder(result.data);
    } catch (error) {
      showToast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    const loadingToast = showToast.loading('Updating status...');
    try {
      const response = await api.put(`/maintenance-orders/${orderId}`),
        body: JSON.stringify({ status: newStatus })
      });

      const result = response.data;
      showToast.dismiss(loadingToast);

      if (result.status === 'success') {
        showToast.success('Status updated');
        fetchOrder();
      } else {
        showToast.error('Failed to update status');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Error updating status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-700',
      assigned: 'bg-cyan-100 text-cyan-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
      <div className="text-slate-600">Loading...</div>
    </div>;
  }

  if (!order) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
      <div className="text-slate-600">Order not found</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{order.order_number}</h1>
              <p className="text-slate-600 mt-1">{order.title}</p>
            </div>
            <div className="flex gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <button onClick={() => router.push(`/admin/maintenance-orders/edit/${orderId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
              <button onClick={() => router.back()} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Back</button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <button onClick={() => updateStatus('assigned')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Assign</button>
            )}
            {order.status === 'assigned' && (
              <button onClick={() => updateStatus('in_progress')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Start Work</button>
            )}
            {order.status === 'in_progress' && (
              <button onClick={() => updateStatus('completed')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Complete</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 p-2">
          <div className="flex gap-2">
            {['overview', 'checklist', 'labor', 'parts', 'logs'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg border border-white/20 p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Order Details</h3>
                <div className="space-y-3">
                  <div><span className="text-slate-600">Type:</span> <span className="font-medium capitalize">{order.order_type}</span></div>
                  <div><span className="text-slate-600">Priority:</span> <span className="font-medium capitalize">{order.priority}</span></div>
                  <div><span className="text-slate-600">Description:</span> <p className="mt-1">{order.description || 'N/A'}</p></div>
                  <div><span className="text-slate-600">Failure Code:</span> <span className="font-medium">{order.failure_code || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Downtime Impact:</span> <span className="font-medium capitalize">{order.downtime_impact}</span></div>
                  <div><span className="text-slate-600">Safety Risk:</span> <span className="font-medium">{order.safety_risk ? 'Yes' : 'No'}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Schedule & Cost</h3>
                <div className="space-y-3">
                  <div><span className="text-slate-600">Scheduled Start:</span> <span className="font-medium">{order.scheduled_start ? new Date(order.scheduled_start).toLocaleString('en-GB') : 'N/A'}</span></div>
                  <div><span className="text-slate-600">Scheduled End:</span> <span className="font-medium">{order.scheduled_end ? new Date(order.scheduled_end).toLocaleString('en-GB') : 'N/A'}</span></div>
                  <div><span className="text-slate-600">Estimated Hours:</span> <span className="font-medium">{order.estimated_hours || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Actual Hours:</span> <span className="font-medium">{order.actual_hours || 'N/A'}</span></div>
                  <div><span className="text-slate-600">Labor Cost:</span> <span className="font-medium">${(order.labor_cost || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-600">Parts Cost:</span> <span className="font-medium">${(order.parts_cost || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-600">Total Cost:</span> <span className="font-bold text-lg">${(order.actual_cost || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Maintenance Checklist</h3>
              {order.checklist && order.checklist.length > 0 ? (
                <div className="space-y-2">
                  {order.checklist.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <input type="checkbox" checked={item.is_completed} readOnly className="w-5 h-5" />
                      <span className={item.is_completed ? 'line-through text-slate-500' : ''}>{item.item_description}</span>
                      {item.result && <span className={`ml-auto px-2 py-1 rounded text-xs font-semibold ${item.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.result.toUpperCase()}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No checklist items</p>
              )}
            </div>
          )}

          {activeTab === 'labor' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Labor Tracking</h3>
              {order.labor && order.labor.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Technician</th>
                      <th className="px-4 py-2 text-left">Start Time</th>
                      <th className="px-4 py-2 text-left">End Time</th>
                      <th className="px-4 py-2 text-left">Hours</th>
                      <th className="px-4 py-2 text-left">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.labor.map((l: any) => (
                      <tr key={l.id} className="border-b">
                        <td className="px-4 py-2">{l.technician_name}</td>
                        <td className="px-4 py-2">{new Date(l.start_time).toLocaleString('en-GB')}</td>
                        <td className="px-4 py-2">{l.end_time ? new Date(l.end_time).toLocaleString('en-GB') : 'In Progress'}</td>
                        <td className="px-4 py-2">{l.hours_worked || '-'}</td>
                        <td className="px-4 py-2">${(l.labor_cost || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-500">No labor records</p>
              )}
            </div>
          )}

          {activeTab === 'parts' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Parts Used</h3>
              {order.parts && order.parts.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Part Name</th>
                      <th className="px-4 py-2 text-left">Part Number</th>
                      <th className="px-4 py-2 text-left">Quantity</th>
                      <th className="px-4 py-2 text-left">Unit Cost</th>
                      <th className="px-4 py-2 text-left">Total</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.parts.map((p: any) => (
                      <tr key={p.id} className="border-b">
                        <td className="px-4 py-2">{p.part_name}</td>
                        <td className="px-4 py-2">{p.part_number}</td>
                        <td className="px-4 py-2">{p.quantity_used || p.quantity_required}</td>
                        <td className="px-4 py-2">${(p.unit_cost || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">${(p.total_cost || 0).toLocaleString()}</td>
                        <td className="px-4 py-2"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-500">No parts used</p>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Activity Log</h3>
              {order.logs && order.logs.length > 0 ? (
                <div className="space-y-3">
                  {order.logs.map((log: any) => (
                    <div key={log.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-slate-900">{log.log_type.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-sm text-slate-500">{new Date(log.created_at).toLocaleString('en-GB')}</span>
                      </div>
                      {log.comment && <p className="text-slate-700">{log.comment}</p>}
                      {log.old_value && log.new_value && (
                        <p className="text-sm text-slate-600 mt-1">Changed from <span className="font-medium">{log.old_value}</span> to <span className="font-medium">{log.new_value}</span></p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No activity logs</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
