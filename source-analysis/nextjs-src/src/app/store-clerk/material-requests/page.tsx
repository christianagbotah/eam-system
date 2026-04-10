'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Package, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function StoreClerkMaterialRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [approvalData, setApprovalData] = useState<any>({ notes: '', items: [] });
  const [issueData, setIssueData] = useState<any>({ notes: '', items: [] });

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/material-requests?status=${filter}`);
      setRequests(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      await api.post(`/material-requests/${selectedRequest.id}/approve`, approvalData);
      alert.success('Success', 'Material request approved');
      setShowApproveModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleIssue = async () => {
    if (!selectedRequest) return;
    
    try {
      await api.post(`/material-requests/${selectedRequest.id}/issue`, issueData);
      alert.success('Success', 'Materials issued successfully');
      setShowIssueModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to issue materials');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await api.post(`/material-requests/${id}/reject`, { reason });
      alert.success('Success', 'Material request rejected');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to reject request');
    }
  };

  const openApproveModal = (request: any) => {
    setSelectedRequest(request);
    setApprovalData({
      notes: '',
      items: request.items.map((item: any) => ({
        id: item.id,
        quantity_approved: item.quantity_requested
      }))
    });
    setShowApproveModal(true);
  };

  const openIssueModal = (request: any) => {
    setSelectedRequest(request);
    setIssueData({
      notes: '',
      items: request.items.map((item: any) => ({
        id: item.id,
        part_id: item.part_id,
        quantity_issued: item.quantity_approved
      }))
    });
    setShowIssueModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      issued: { bg: 'bg-green-100', text: 'text-green-800', icon: Package },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text} inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: any = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors[priority] || colors.normal}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Material Requests Management</h1>
          <p className="text-indigo-100">Approve and issue materials for work orders</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex gap-2 mb-4">
            {['pending', 'approved', 'issued', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No {filter} requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{request.request_number}</h3>
                        {getStatusBadge(request.status)}
                        {getPriorityBadge(request.priority)}
                      </div>
                      <p className="text-sm text-gray-600">
                        WO #{request.work_order_number} - {request.work_order_title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested by: {request.requested_by_name} • {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApproveModal(request)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => openIssueModal(request)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
                        >
                          Issue Materials
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Items:</h4>
                    <div className="space-y-2">
                      {request.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-900">{item.part_name} ({item.part_number})</span>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-600">Requested: {item.quantity_requested}</span>
                            {item.quantity_approved > 0 && (
                              <span className="text-blue-600 font-medium">Approved: {item.quantity_approved}</span>
                            )}
                            {item.quantity_issued > 0 && (
                              <span className="text-green-600 font-medium">Issued: {item.quantity_issued}</span>
                            )}
                            <span className="text-gray-500">Stock: {item.current_stock}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      <strong>Notes:</strong> {request.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 p-4 text-white">
              <h2 className="text-xl font-bold">Approve Material Request</h2>
              <p className="text-green-100 text-sm">{selectedRequest.request_number}</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {selectedRequest.items.map((item: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{item.part_name}</p>
                        <p className="text-sm text-gray-600">{item.part_number}</p>
                      </div>
                      <span className="text-sm text-gray-500">Stock: {item.current_stock}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Requested</label>
                        <input
                          type="number"
                          value={item.quantity_requested}
                          disabled
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Approve Quantity</label>
                        <input
                          type="number"
                          value={approvalData.items[idx]?.quantity_approved || 0}
                          onChange={(e) => {
                            const updated = [...approvalData.items];
                            updated[idx].quantity_approved = parseFloat(e.target.value) || 0;
                            setApprovalData({ ...approvalData, items: updated });
                          }}
                          max={item.current_stock}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Approval Notes</label>
                  <textarea
                    value={approvalData.notes}
                    onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
              >
                Approve Request
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-indigo-600 p-4 text-white">
              <h2 className="text-xl font-bold">Issue Materials</h2>
              <p className="text-indigo-100 text-sm">{selectedRequest.request_number}</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {selectedRequest.items.map((item: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{item.part_name}</p>
                        <p className="text-sm text-gray-600">{item.part_number}</p>
                      </div>
                      <span className="text-sm text-gray-500">Stock: {item.current_stock}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Approved</label>
                        <input
                          type="number"
                          value={item.quantity_approved}
                          disabled
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Issue Quantity</label>
                        <input
                          type="number"
                          value={issueData.items[idx]?.quantity_issued || 0}
                          onChange={(e) => {
                            const updated = [...issueData.items];
                            updated[idx].quantity_issued = parseFloat(e.target.value) || 0;
                            setIssueData({ ...issueData, items: updated });
                          }}
                          max={Math.min(item.quantity_approved, item.current_stock)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Notes</label>
                  <textarea
                    value={issueData.notes}
                    onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            </div>
            <div className="border-t p-4 flex gap-3">
              <button
                onClick={handleIssue}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
              >
                Issue Materials
              </button>
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
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
