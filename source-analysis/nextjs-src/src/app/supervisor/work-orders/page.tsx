'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function SupervisorWorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [toolApprovals, setToolApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('work-orders');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const plantId = localStorage.getItem('current_plant_id') || 1;
      const [woRes, toolRes] = await Promise.all([
        api.get('/work-orders'),
        api.get(`/tool-requests/pending-approvals?plant_id=${plantId}`)
      ]);

      setWorkOrders(woRes.data?.data || []);
      setToolApprovals(toolRes.data?.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveToolRequest = async (requestId: number) => {
    if (!confirm('Approve this tool request?')) return;

    try {
      await api.post(`/tool-requests/${requestId}/approve`);
      alert('Tool request approved');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectToolRequest = async (requestId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/tool-requests/${requestId}/reject`, { reason });
      alert('Tool request rejected');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Work Orders & Approvals</h1>
        <p className="text-sm text-gray-600 mt-1">Manage work orders and approve tool requests</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('work-orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'work-orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Work Orders ({workOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('tool-approvals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tool-approvals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🛠️ Tool Approvals ({toolApprovals.length})
          </button>
        </nav>
      </div>

      {/* Work Orders Tab */}
      {activeTab === 'work-orders' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No work orders found
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{wo.work_order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{wo.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{wo.asset_name || wo.machine_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        wo.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/work-orders/${wo.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tool Approvals Tab */}
      {activeTab === 'tool-approvals' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {toolApprovals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No pending tool approvals
                  </td>
                </tr>
              ) : (
                toolApprovals.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.wo_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{request.tool_name}</div>
                      <div className="text-xs text-gray-500">{request.tool_code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{request.requested_by_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.reason || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveToolRequest(request.id)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectToolRequest(request.id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
