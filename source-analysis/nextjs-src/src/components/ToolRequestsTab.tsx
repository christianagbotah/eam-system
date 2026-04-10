'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import ToolRequestModal from './ToolRequestModal';
import { Wrench, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';

interface ToolRequestsTabProps {
  workOrderId: number;
  userRole: string;
}

export default function ToolRequestsTab({ workOrderId, userRole }: ToolRequestsTabProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [damageNotes, setDamageNotes] = useState('');
  const [penaltyCost, setPenaltyCost] = useState(0);

  useEffect(() => {
    loadRequests();
  }, [workOrderId]);

  const loadRequests = async () => {
    try {
      const res = await api.get(`/work-orders/${workOrderId}/tool-requests`);
      setRequests(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load tool requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/tool-requests/${id}/approve`);
      alert.success('Success', 'Request approved');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/tool-requests/${id}/reject`, { reason });
      alert.success('Success', 'Request rejected');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to reject');
    }
  };

  const handleIssue = async (id: number) => {
    const condition = prompt('Condition on issue (GOOD/FAIR):', 'GOOD');
    if (!condition) return;

    try {
      await api.post(`/tool-requests/${id}/issue`, { condition_on_issue: condition });
      alert.success('Success', 'Tool issued successfully');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to issue');
    }
  };

  const handleMarkReturn = async (id: number) => {
    try {
      await api.post(`/tool-requests/${id}/mark-return`);
      alert.success('Success', 'Return marked, awaiting verification');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to mark return');
    }
  };

  const handleVerifyReturn = async (id: number) => {
    try {
      await api.post(`/tool-requests/${id}/verify-return`, {
        condition_on_return: returnCondition,
        damage_notes: damageNotes,
        penalty_cost: penaltyCost
      });
      alert.success('Success', 'Return verified successfully');
      setSelectedRequest(null);
      setReturnCondition('GOOD');
      setDamageNotes('');
      setPenaltyCost(0);
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to verify return');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      ISSUED: 'bg-blue-100 text-blue-800 border-blue-300',
      RETURN_PENDING: 'bg-orange-100 text-orange-800 border-orange-300',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-300',
      CANCELLED: 'bg-gray-100 text-gray-500 border-gray-300'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const canRequestTool = userRole === 'technician';
  const canApprove = userRole === 'supervisor' || userRole === 'admin';
  const canIssue = userRole === 'store_clerk' || userRole === 'admin';

  if (loading) {
    return <div className="p-4 text-center">Loading tool requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.request_status === 'PENDING');
  const approvedRequests = requests.filter(r => r.request_status === 'APPROVED');
  const issuedRequests = requests.filter(r => r.request_status === 'ISSUED');
  const returnPendingRequests = requests.filter(r => r.request_status === 'RETURN_PENDING');
  const completedRequests = requests.filter(r => r.request_status === 'COMPLETED');

  return (
    <div className="space-y-4">
      {canRequestTool && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Tool Requests</h3>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold inline-flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Request Tool
          </button>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <h4 className="font-bold text-yellow-900 mb-3">⏳ Pending Approval ({pendingRequests.length})</h4>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-yellow-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{req.tool_code} - {req.tool_name}</p>
                    <p className="text-sm text-gray-600">Qty: {req.quantity} | Requested by: {req.requested_by_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                  </div>
                  {canApprove && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved - Ready to Issue */}
      {approvedRequests.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-green-900 mb-3">✅ Approved - Ready to Issue ({approvedRequests.length})</h4>
          <div className="space-y-2">
            {approvedRequests.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{req.tool_code} - {req.tool_name}</p>
                    <p className="text-sm text-gray-600">Qty: {req.quantity} | For: {req.requested_by_name}</p>
                    <p className="text-xs text-green-700">Approved by: {req.approved_by_name} at {formatDateTime(req.approved_at)}</p>
                  </div>
                  {canIssue && (
                    <button
                      onClick={() => handleIssue(req.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                    >
                      Issue Tool
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issued Tools */}
      {issuedRequests.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h4 className="font-bold text-blue-900 mb-3">🔧 Issued Tools ({issuedRequests.length})</h4>
          <div className="space-y-2">
            {issuedRequests.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{req.tool_code} - {req.tool_name}</p>
                    <p className="text-sm text-gray-600">Qty: {req.quantity} | Issued to: {req.requested_by_name}</p>
                    {req.expected_return_date && (
                      <p className="text-xs text-blue-700">Expected return: {formatDateTime(req.expected_return_date)}</p>
                    )}
                  </div>
                  {canRequestTool && (
                    <button
                      onClick={() => handleMarkReturn(req.id)}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700"
                    >
                      Mark Return
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return Pending Verification */}
      {returnPendingRequests.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <h4 className="font-bold text-orange-900 mb-3">🔄 Awaiting Return Verification ({returnPendingRequests.length})</h4>
          <div className="space-y-2">
            {returnPendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{req.tool_code} - {req.tool_name}</p>
                    <p className="text-sm text-gray-600">Returned by: {req.requested_by_name}</p>
                  </div>
                  {canIssue && (
                    <div className="space-y-2">
                      <select
                        value={selectedRequest?.id === req.id ? returnCondition : 'GOOD'}
                        onChange={(e) => {
                          setSelectedRequest(req);
                          setReturnCondition(e.target.value);
                        }}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="LOST">Lost</option>
                      </select>
                      {selectedRequest?.id === req.id && returnCondition === 'DAMAGED' && (
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Damage notes"
                            value={damageNotes}
                            onChange={(e) => setDamageNotes(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Penalty cost"
                            value={penaltyCost}
                            onChange={(e) => setPenaltyCost(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border rounded text-xs"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleVerifyReturn(req.id)}
                        className="w-full px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700"
                      >
                        Verify Return
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedRequests.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-bold text-gray-700 mb-3">✔️ Completed ({completedRequests.length})</h4>
          <div className="space-y-2">
            {completedRequests.map(req => (
              <div key={req.id} className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="font-bold text-gray-900">{req.tool_code} - {req.tool_name}</p>
                <p className="text-sm text-gray-600">Returned: {formatDateTime(req.actual_return_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Wrench className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No tool requests yet</p>
        </div>
      )}

      <ToolRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        workOrderId={workOrderId}
        onSuccess={loadRequests}
      />
    </div>
  );
}
