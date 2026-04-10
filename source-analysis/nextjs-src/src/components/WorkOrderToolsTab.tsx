'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import SearchableSelect from './SearchableSelect';

interface ToolRequest {
  id: number;
  tool_id: number;
  tool_name: string;
  tool_code: string;
  category: string;
  quantity: number;
  reason: string;
  request_status: string;
  requested_by_name: string;
  approved_by_name: string;
  expected_return_date: string;
  actual_return_date: string;
  created_at: string;
}

interface Tool {
  id: number;
  tool_code: string;
  tool_name: string;
  category: string;
  availability_status: string;
  condition_status: string;
  is_calibrated: boolean;
  calibration_due_date: string;
}

export default function WorkOrderToolsTab({ workOrderId, userRole }: { workOrderId: number; userRole: string }) {
  const [toolRequests, setToolRequests] = useState<ToolRequest[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ToolRequest | null>(null);
  
  const [requestForm, setRequestForm] = useState({
    tool_id: '',
    quantity: 1,
    reason: '',
    expected_return_date: ''
  });

  const [issueForm, setIssueForm] = useState({
    condition_on_issue: 'GOOD'
  });

  const [returnForm, setReturnForm] = useState({
    condition_on_return: 'GOOD',
    damage_notes: '',
    penalty_cost: 0
  });

  useEffect(() => {
    loadData();
  }, [workOrderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsRes, toolsRes] = await Promise.all([
        api.get(`/tool-requests?work_order_id=${workOrderId}`),
        api.get('/tools?limit=1000')
      ]);
      
      setToolRequests(requestsRes.data.data || []);
      setAvailableTools(toolsRes.data.data?.filter((t: Tool) => t.availability_status === 'AVAILABLE') || []);
    } catch (error) {
      console.error('Error loading tool data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTool = async () => {
    try {
      await api.post('/tool-requests', {
        work_order_id: workOrderId,
        ...requestForm
      });
      setShowRequestModal(false);
      setRequestForm({ tool_id: '', quantity: 1, reason: '', expected_return_date: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to request tool');
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      await api.post(`/tool-requests/${requestId}/approve`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await api.post(`/tool-requests/${requestId}/reject`, { reason });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleIssueTool = async () => {
    if (!selectedRequest) return;
    
    try {
      await api.post(`/tool-requests/${selectedRequest.id}/issue`, issueForm);
      setShowIssueModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to issue tool');
    }
  };

  const handleMarkReturn = async (requestId: number) => {
    try {
      await api.post(`/tool-requests/${requestId}/mark-return`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to mark return');
    }
  };

  const handleVerifyReturn = async () => {
    if (!selectedRequest) return;
    
    try {
      await api.post(`/tool-requests/${selectedRequest.id}/verify-return`, returnForm);
      setShowReturnModal(false);
      setSelectedRequest(null);
      setReturnForm({ condition_on_return: 'GOOD', damage_notes: '', penalty_cost: 0 });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to verify return');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      ISSUED: 'bg-green-100 text-green-800',
      RETURN_PENDING: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const isOverdue = (expectedDate: string) => {
    if (!expectedDate) return false;
    return new Date(expectedDate) < new Date();
  };

  if (loading) {
    return <div className="p-4 text-center">Loading tools...</div>;
  }

  const pendingRequests = toolRequests.filter(r => r.request_status === 'PENDING');
  const approvedRequests = toolRequests.filter(r => r.request_status === 'APPROVED');
  const issuedTools = toolRequests.filter(r => r.request_status === 'ISSUED');
  const returnPendingTools = toolRequests.filter(r => r.request_status === 'RETURN_PENDING');
  const completedRequests = toolRequests.filter(r => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.request_status));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">🛠 Tool Requests & Issuance</h3>
        {userRole === 'technician' && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            + Request Tool
          </button>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-bold text-yellow-900 mb-3">⏳ Pending Approval ({pendingRequests.length})</h4>
          <div className="space-y-2">
            {pendingRequests.map(request => (
              <div key={request.id} className="bg-white p-3 rounded border flex justify-between items-center">
                <div>
                  <div className="font-semibold">{request.tool_name} ({request.tool_code})</div>
                  <div className="text-xs text-gray-600">Requested by: {request.requested_by_name}</div>
                  <div className="text-xs text-gray-600">Reason: {request.reason}</div>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(request.request_status)}
                  {(userRole === 'supervisor' || userRole === 'admin') && (
                    <>
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Requests */}
      {approvedRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-bold text-blue-900 mb-3">✅ Approved - Awaiting Issue ({approvedRequests.length})</h4>
          <div className="space-y-2">
            {approvedRequests.map(request => (
              <div key={request.id} className="bg-white p-3 rounded border flex justify-between items-center">
                <div>
                  <div className="font-semibold">{request.tool_name} ({request.tool_code})</div>
                  <div className="text-xs text-gray-600">Approved by: {request.approved_by_name}</div>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(request.request_status)}
                  {(userRole === 'store_clerk' || userRole === 'admin') && (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowIssueModal(true);
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
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
      {issuedTools.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-green-900 mb-3">🔧 Currently Issued ({issuedTools.length})</h4>
          <div className="space-y-2">
            {issuedTools.map(request => (
              <div key={request.id} className={`bg-white p-3 rounded border flex justify-between items-center ${isOverdue(request.expected_return_date) ? 'border-red-500 border-2' : ''}`}>
                <div>
                  <div className="font-semibold">{request.tool_name} ({request.tool_code})</div>
                  <div className="text-xs text-gray-600">Expected return: {new Date(request.expected_return_date).toLocaleDateString()}</div>
                  {isOverdue(request.expected_return_date) && (
                    <div className="text-xs text-red-600 font-bold">⚠️ OVERDUE</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(request.request_status)}
                  {userRole === 'technician' && (
                    <button
                      onClick={() => handleMarkReturn(request.id)}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
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

      {/* Return Pending */}
      {returnPendingTools.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-bold text-orange-900 mb-3">📦 Awaiting Return Verification ({returnPendingTools.length})</h4>
          <div className="space-y-2">
            {returnPendingTools.map(request => (
              <div key={request.id} className="bg-white p-3 rounded border flex justify-between items-center">
                <div>
                  <div className="font-semibold">{request.tool_name} ({request.tool_code})</div>
                  <div className="text-xs text-gray-600">Returned by technician - awaiting store verification</div>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(request.request_status)}
                  {(userRole === 'store_clerk' || userRole === 'admin') && (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowReturnModal(true);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Verify Return
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-3">📋 History ({completedRequests.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {completedRequests.map(request => (
              <div key={request.id} className="bg-white p-2 rounded border flex justify-between items-center text-sm">
                <div>
                  <div className="font-semibold">{request.tool_name}</div>
                  <div className="text-xs text-gray-600">
                    {request.actual_return_date && `Returned: ${new Date(request.actual_return_date).toLocaleDateString()}`}
                  </div>
                </div>
                {getStatusBadge(request.request_status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Tool Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Request Tool</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Tool</label>
                <SearchableSelect
                  value={requestForm.tool_id}
                  onChange={(value) => setRequestForm({...requestForm, tool_id: value})}
                  options={availableTools.map(tool => ({
                    id: tool.id.toString(),
                    label: `${tool.tool_name} (${tool.tool_code})`,
                    sublabel: tool.category
                  }))}
                  placeholder="Search tools..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Quantity</label>
                <input
                  type="number"
                  value={requestForm.quantity}
                  onChange={(e) => setRequestForm({...requestForm, quantity: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Reason</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Expected Return Date</label>
                <input
                  type="date"
                  value={requestForm.expected_return_date}
                  onChange={(e) => setRequestForm({...requestForm, expected_return_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleRequestTool}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Submit Request
              </button>
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Tool Modal */}
      {showIssueModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Issue Tool</h3>
            <div className="mb-4">
              <div className="font-semibold">{selectedRequest.tool_name}</div>
              <div className="text-sm text-gray-600">To: {selectedRequest.requested_by_name}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Condition on Issue</label>
                <select
                  value={issueForm.condition_on_issue}
                  onChange={(e) => setIssueForm({...issueForm, condition_on_issue: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleIssueTool}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Issue Tool
              </button>
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Return Modal */}
      {showReturnModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Verify Tool Return</h3>
            <div className="mb-4">
              <div className="font-semibold">{selectedRequest.tool_name}</div>
              <div className="text-sm text-gray-600">From: {selectedRequest.requested_by_name}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Condition on Return</label>
                <select
                  value={returnForm.condition_on_return}
                  onChange={(e) => setReturnForm({...returnForm, condition_on_return: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
              {(returnForm.condition_on_return === 'DAMAGED' || returnForm.condition_on_return === 'LOST') && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Damage Notes</label>
                    <textarea
                      value={returnForm.damage_notes}
                      onChange={(e) => setReturnForm({...returnForm, damage_notes: e.target.value})}
                      className="w-full px-3 py-2 border rounded"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Penalty Cost ($)</label>
                    <input
                      type="number"
                      value={returnForm.penalty_cost}
                      onChange={(e) => setReturnForm({...returnForm, penalty_cost: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border rounded"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleVerifyReturn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Verify Return
              </button>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedRequest(null);
                  setReturnForm({ condition_on_return: 'GOOD', damage_notes: '', penalty_cost: 0 });
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
