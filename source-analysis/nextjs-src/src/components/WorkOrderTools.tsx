'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import SearchableSelect from './SearchableSelect';
import { alert } from '@/components/AlertModalProvider';

interface ToolRequest {
  id: number;
  request_number: string;
  work_order_id: number;
  requested_by: number;
  requested_by_name: string;
  approved_by_name?: string;
  reason?: string;
  request_status: string;
  required_from_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  created_at: string;
  items_count: number;
  items?: ToolRequestItem[];
}

interface ToolRequestItem {
  id: number;
  tool_id: number;
  tool_code: string;
  tool_name: string;
  category: string;
  quantity: number;
  issued_quantity: number;
  condition_on_issue?: string;
  issue_notes?: string;
  condition_on_return?: string;
  damage_notes?: string;
}

interface Tool {
  id: number;
  tool_code: string;
  tool_name: string;
  category: string;
  availability_status: string;
  condition_status: string;
  is_calibrated: boolean;
  calibration_due_date?: string;
  is_pre_allocated?: boolean;
  allocation_status?: string;
}

interface WorkOrderToolsProps {
  workOrderId: number;
  plantId: number;
  userRole: string;
  userId: number;
}

export default function WorkOrderTools({ workOrderId, plantId, userRole, userId }: WorkOrderToolsProps) {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ToolRequest | null>(null);

  const [requestForm, setRequestForm] = useState({
    tool_rows: [{ tool_id: '', quantity: 1 }] as { tool_id: string; quantity: number }[],
    reason: '',
    expected_return_date: ''
  });

  const [requestDate] = useState(new Date().toISOString().slice(0, 16));

  const [verifyForm, setVerifyForm] = useState({
    condition: 'GOOD',
    damage_notes: '',
    penalty_cost: 0
  });

  useEffect(() => {
    loadRequests();
    if (userRole === 'technician' || userRole === 'planner') {
      loadAvailableTools();
    }
  }, [workOrderId, plantId]);

  const loadRequests = async () => {
    try {
      const response = await api.get(`/tool-requests?work_order_id=${workOrderId}`);
      const data = response.data.data || [];
      console.log('Tool requests loaded:', data);
      setRequests(data);
    } catch (error) {
      console.error('Error loading tool requests:', error);
    }
  };

  const loadAvailableTools = async () => {
    try {
      const response = await api.get(`/tools?work_order_id=${workOrderId}`);
      setAvailableTools(response.data.data || []);
    } catch (error) {
      console.error('Error loading tools:', error);
    }
  };

  const handleRequestTool = async () => {
    const validRows = requestForm.tool_rows.filter(row => row.tool_id && row.quantity > 0);
    
    if (validRows.length === 0) {
      alert.error('Error', 'Please select at least one tool');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        work_order_id: workOrderId,
        tools: validRows.map(row => ({
          tool_id: parseInt(row.tool_id),
          quantity: row.quantity
        })),
        reason: requestForm.reason,
        expected_return_date: requestForm.expected_return_date
      };

      await api.post('/tool-requests', requestData);
      
      alert.success('Success', `Tool request created with ${validRows.length} tool(s)`);
      setShowRequestModal(false);
      setRequestForm({
        tool_rows: [{ tool_id: '', quantity: 1 }],
        reason: '',
        expected_return_date: ''
      });
      loadRequests();
      loadAvailableTools();
    } catch (error: any) {
      const errorMsg = error.response?.data?.messages?.error || error.response?.data?.message || 'Failed to create tool request';
      alert.error('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    const confirmed = await alert.confirm('Approve Request', 'Approve this tool request?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.post(`/tool-requests/${requestId}/approve`);
      
      alert.success('Success', 'Tool request approved');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: number) => {
    const reason = await alert.prompt('Reject Request', 'Enter rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      await api.post(`/tool-requests/${requestId}/reject`, { reason });
      
      alert.success('Success', 'Tool request rejected');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId: number) => {
    const confirmed = await alert.confirm('Cancel Request', 'Are you sure you want to cancel this tool request?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.post(`/tool-requests/${requestId}/cancel`);
      
      alert.success('Success', 'Tool request cancelled');
      loadRequests();
      loadAvailableTools();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (requestId: number) => {
    const condition = await alert.prompt('Issue Tool', 'Tool condition on issue (GOOD/FAIR):', 'GOOD');
    if (!condition) return;

    setLoading(true);
    try {
      await api.post(`/tool-requests/${requestId}/issue`, { condition });
      
      alert.success('Success', 'Tool issued successfully');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to issue tool');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturn = async (requestId: number) => {
    const confirmed = await alert.confirm('Mark Return', 'Mark this tool for return?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.post(`/tool-requests/${requestId}/mark-return`);
      
      alert.success('Success', 'Tool marked for return');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to mark return');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReturn = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      await api.post(`/tool-requests/${selectedRequest.id}/verify-return`, verifyForm);
      
      alert.success('Success', 'Tool return verified successfully');
      setShowVerifyModal(false);
      setSelectedRequest(null);
      setVerifyForm({ condition: 'GOOD', damage_notes: '', penalty_cost: 0 });
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to verify return');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      ISSUED: 'bg-green-100 text-green-800',
      PARTIAL_ISSUED: 'bg-yellow-100 text-yellow-800',
      RETURN_PENDING: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const isOverdue = (expectedDate: string) => {
    return expectedDate && new Date(expectedDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">🛠️ Tool Requests</h3>
        {(userRole === 'technician' || userRole === 'planner') && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Request Tool
          </button>
        )}
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tools</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No tool requests yet
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-bold text-blue-600">{request.request_number}</div>
                    <div className="text-xs text-gray-500">{request.items_count} tool(s)</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {request.items && request.items.length > 0 ? (
                        request.items.map((item, idx) => {
                          const isPartial = Number(item.issued_quantity) > 0 && Number(item.issued_quantity) < Number(item.quantity);
                          const notIssued = Number(item.issued_quantity) === 0 && ['ISSUED', 'PARTIAL_ISSUED'].includes(request.request_status);
                          const isDamaged = item.condition_on_return === 'DAMAGED';
                          const isLost = item.condition_on_return === 'LOST';
                          const noteText = item.issue_notes;
                          
                          return (
                            <div key={idx} className="text-xs mb-1">
                              <div className="flex items-center gap-1">
                                <span>{item.tool_name}</span>
                                {['ISSUED', 'PARTIAL_ISSUED', 'RETURN_PENDING', 'COMPLETED'].includes(request.request_status) ? (
                                  <span className={`font-semibold ${
                                    notIssued ? 'text-red-600' : 
                                    isPartial ? 'text-orange-600' : 
                                    'text-green-600'
                                  }`}>
                                    ({item.issued_quantity}/{item.quantity} issued)
                                  </span>
                                ) : (
                                  <span>(x{item.quantity})</span>
                                )}
                              </div>
                              {notIssued && (
                                <div className="text-red-600 font-medium mt-0.5 bg-red-50 px-2 py-1 rounded">
                                  ⚠️ NOT ISSUED - Status: {item.condition_on_issue || 'Unknown'}
                                  {noteText && (
                                    <div className="text-xs mt-0.5">Reason: {noteText}</div>
                                  )}
                                </div>
                              )}
                              {isPartial && (
                                <div className="text-orange-600 font-medium mt-0.5 bg-orange-50 px-2 py-1 rounded">
                                  ⚠️ PARTIAL ISSUE - Status: {item.condition_on_issue || 'Unknown'}
                                  {noteText && (
                                    <div className="text-xs mt-0.5">Reason: {noteText}</div>
                                  )}
                                </div>
                              )}
                              {(isDamaged || isLost) && (
                                <div className="text-red-700 font-bold mt-0.5 bg-red-100 px-2 py-1 rounded border border-red-300">
                                  🚨 RETURNED {isLost ? 'LOST' : 'DAMAGED'}
                                  {item.damage_notes && (
                                    <div className="text-xs mt-0.5">Notes: {item.damage_notes}</div>
                                  )}
                                  {item.penalty_cost > 0 && (
                                    <div className="text-xs mt-0.5 font-semibold">Cost: ${Number(item.penalty_cost).toFixed(2)}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-500">Loading...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(request.request_status)}`}>
                      {request.request_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{request.requested_by_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>{new Date(request.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(userRole === 'technician' || userRole === 'planner') && (request.request_status === 'PENDING' || request.request_status === 'APPROVED') && request.requested_by === userId && (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      )}
                      {(userRole === 'supervisor' || userRole === 'planner') && request.request_status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            disabled={loading}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {(userRole === 'shop-attendant' || userRole === 'admin') && request.request_status === 'APPROVED' && (
                        <button
                          onClick={() => handleIssue(request.id)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          disabled={loading}
                        >
                          Issue
                        </button>
                      )}
                      {(userRole === 'technician' || userRole === 'planner') && request.request_status === 'ISSUED' && (
                        <button
                          onClick={() => handleMarkReturn(request.id)}
                          className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                          disabled={loading}
                        >
                          Mark Return
                        </button>
                      )}
                      {(userRole === 'shop-attendant' || userRole === 'admin') && request.request_status === 'RETURN_PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowVerifyModal(true);
                          }}
                          className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                          disabled={loading}
                        >
                          Verify Return
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

      {/* Request Tool Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Request Tool</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tools & Quantities</label>
                {requestForm.tool_rows.map((row, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <SearchableSelect
                        value={row.tool_id}
                        onChange={(value) => {
                          const newRows = [...requestForm.tool_rows];
                          newRows[index].tool_id = value;
                          setRequestForm({ ...requestForm, tool_rows: newRows });
                        }}
                        options={availableTools
                          .filter(tool => {
                            const selectedIds = requestForm.tool_rows.map(r => r.tool_id).filter(id => id !== row.tool_id);
                            return !selectedIds.includes(tool.id.toString());
                          })
                          .map((tool) => {
                          let statusIcon = '';
                          let statusText = '';
                          
                          if (tool.is_pre_allocated) {
                            statusIcon = '✅';
                            statusText = `Pre-allocated (${tool.allocation_status})`;
                          } else if (tool.availability_status === 'AVAILABLE') {
                            statusIcon = '✅';
                            statusText = 'Available';
                          } else {
                            statusIcon = '🔴';
                            statusText = tool.availability_status;
                          }
                          
                          return {
                            id: tool.id.toString(),
                            label: `${tool.tool_name} (${tool.tool_code})`,
                            sublabel: `${tool.category} - ${statusIcon} ${statusText}`
                          };
                        })}
                        placeholder="Select tool..."
                      />
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => {
                        const newRows = [...requestForm.tool_rows];
                        newRows[index].quantity = parseInt(e.target.value) || 1;
                        setRequestForm({ ...requestForm, tool_rows: newRows });
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Qty"
                    />
                    {requestForm.tool_rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newRows = requestForm.tool_rows.filter((_, i) => i !== index);
                          setRequestForm({ ...requestForm, tool_rows: newRows });
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRequestForm({
                      ...requestForm,
                      tool_rows: [...requestForm.tool_rows, { tool_id: '', quantity: 1 }]
                    });
                  }}
                  disabled={!requestForm.tool_rows[requestForm.tool_rows.length - 1].tool_id}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  + Add Another Tool
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
                <input
                  type="datetime-local"
                  value={requestDate}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return</label>
                <input
                  type="datetime-local"
                  value={requestForm.expected_return_date}
                  onChange={(e) => setRequestForm({ ...requestForm, expected_return_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRequestTool}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Requesting...' : 'Request Tool'}
              </button>
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Return Modal */}
      {showVerifyModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Verify Tool Return</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tool: {selectedRequest.tool_name} ({selectedRequest.tool_code})
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition on Return</label>
                <select
                  value={verifyForm.condition}
                  onChange={(e) => setVerifyForm({ ...verifyForm, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              {(verifyForm.condition === 'DAMAGED' || verifyForm.condition === 'LOST') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Damage Notes</label>
                    <textarea
                      value={verifyForm.damage_notes}
                      onChange={(e) => setVerifyForm({ ...verifyForm, damage_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={verifyForm.penalty_cost}
                      onChange={(e) => setVerifyForm({ ...verifyForm, penalty_cost: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleVerifyReturn}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Return'}
              </button>
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
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
