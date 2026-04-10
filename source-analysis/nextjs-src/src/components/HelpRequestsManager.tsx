'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function HelpRequestsManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHelpRequests();
  }, []);

  const loadHelpRequests = async () => {
    try {
      const res = await api.get('/work-order-team/help-requests');
      setRequests(res.data?.data || []);
    } catch (error) {
      console.error('Error loading help requests:', error);
    }
  };

  const handleApprove = async (requestId: number) => {
    if (!confirm('Approve this help request?')) return;
    
    setLoading(true);
    try {
      await api.post(`/work-order-team/help-request/${requestId}/approve`);
      loadHelpRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!confirm('Reject this help request?')) return;
    
    setLoading(true);
    try {
      await api.post(`/work-order-team/help-request/${requestId}/reject`);
      loadHelpRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Help Requests</h2>
      
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No pending help requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div key={request.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium">Work Order: {request.work_order_number}</div>
                  <div className="text-sm text-gray-600">
                    Requested by: {request.requester_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Date: {new Date(request.created_at).toLocaleString()}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status}
                </span>
              </div>

              <div className="mb-3">
                <div className="text-sm font-medium mb-1">Reason:</div>
                <div className="text-sm text-gray-700">{request.reason}</div>
              </div>

              <div className="mb-3">
                <div className="text-sm font-medium mb-1">Requested Technicians:</div>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(request.requested_technicians || '[]').map((techId: number) => (
                    <span key={techId} className="px-2 py-1 bg-gray-100 rounded text-xs">
                      Technician #{techId}
                    </span>
                  ))}
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
