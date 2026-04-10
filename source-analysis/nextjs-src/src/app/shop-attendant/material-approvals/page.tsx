'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Package, User } from 'lucide-react';

export default function MaterialApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/v1/eam/material-requests?status=${filter}`);
      const data = await response.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await fetch(`/api/v1/eam/material-requests/${id}/approve`, { method: 'POST' });
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await fetch(`/api/v1/eam/material-requests/${id}/reject`, { method: 'POST' });
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-base md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-8 h-8 text-blue-600" />
          Material Approvals
        </h1>
        <p className="text-xs text-gray-600 mt-0.5">Review and approve material requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((req: any) => (
          <div key={req.id} className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <Package className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{req.part_name}</h3>
                    <p className="text-sm text-gray-600">Part #: {req.part_number}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {req.requested_by}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(req.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Quantity:</span>
                    <span className="ml-2 font-medium text-gray-900">{req.quantity_requested}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">WO:</span>
                    <span className="ml-2 font-medium text-gray-900">{req.work_order_title}</span>
                  </div>
                </div>
              </div>

              {filter === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="flex-1 md:flex-none px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex-1 md:flex-none px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
