'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function MaterialApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      const res = await api.get(`/material-requests?status=${filter}`);
      setRequests(res.data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleApprove = async (request) => {
    try {
      setLoading(true);
      const items = request.items.map(item => ({
        id: item.id,
        quantity_approved: item.quantity_requested
      }));
      await api.post(`/material-requests/${request.id}/approve`, { items });
      alert('Request approved');
      setShowModal(false);
      loadRequests();
    } catch (error) {
      alert('Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      setLoading(true);
      await api.post(`/material-requests/${request.id}/reject`, { reason });
      alert('Request rejected');
      setShowModal(false);
      loadRequests();
    } catch (error) {
      alert('Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (request) => {
    try {
      setLoading(true);
      const items = request.items.map(item => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        quantity_issued: item.quantity_approved || item.quantity_requested,
        unit_cost: 0
      }));
      await api.post(`/material-requests/${request.id}/issue`, { items });
      alert('Materials issued');
      setShowModal(false);
      loadRequests();
    } catch (error) {
      alert('Failed to issue');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request, type) => {
    setSelectedRequest(request);
    setModalType(type);
    setShowModal(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Material Request Approvals</h1>
          <p className="text-xs text-gray-600 mt-0.5">Review and approve material requests</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          {['pending', 'approved', 'issued', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No requests found</td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{request.request_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{request.requested_by_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(request.requested_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      request.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {request.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{request.items?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'issued' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <button
                          onClick={() => openModal(request, 'approve')}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Review
                        </button>
                      )}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => openModal(request, 'issue')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Issue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-base font-semibold mb-4">
              {modalType === 'approve' ? 'Review Request' : 'Issue Materials'} - {selectedRequest.request_number}
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Requested By:</span> {selectedRequest.requested_by_name}</div>
                <div><span className="font-medium">Date:</span> {new Date(selectedRequest.requested_date).toLocaleString()}</div>
                <div><span className="font-medium">Priority:</span> {selectedRequest.priority}</div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Items:</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Qty Requested</th>
                      <th className="px-3 py-2 text-left">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedRequest.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{item.item_name}</td>
                        <td className="px-3 py-2">{item.quantity_requested}</td>
                        <td className="px-3 py-2">{item.purpose || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              {modalType === 'approve' ? (
                <>
                  <button
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={loading}
                    className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest)}
                    disabled={loading}
                    className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleIssue(selectedRequest)}
                  disabled={loading}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Issue Materials
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
