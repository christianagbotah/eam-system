'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Wrench, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Package, User, Calendar, FileText } from 'lucide-react';

interface ToolItem {
  id: number;
  tool_id: number;
  tool_name: string;
  tool_code: string;
  category: string;
  quantity: number;
  issued_quantity: number;
  condition_on_issue?: string;
  issue_notes?: string;
  condition_on_return?: string;
  damage_notes?: string;
  penalty_cost?: number;
}

interface ToolRequest {
  id: number;
  request_number: string;
  work_order_id: number;
  work_order_number: string;
  requested_by: number;
  requested_by_name: string;
  request_status: string;
  items_count: number;
  items: ToolItem[];
  created_at: string;
  approved_at?: string;
  approved_by_name?: string;
  rejected_at?: string;
  rejected_by_name?: string;
  rejection_reason?: string;
}

export default function SupervisorToolRequestsPage() {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await api.get('/tool-requests');
      const data = response.data.data || [];
      setRequests(data);
      
      setStats({
        total: data.length,
        pending: data.filter((r: ToolRequest) => r.request_status === 'PENDING').length,
        approved: data.filter((r: ToolRequest) => r.request_status === 'APPROVED').length,
        rejected: data.filter((r: ToolRequest) => r.request_status === 'REJECTED').length
      });
    } catch (error) {
      console.error('Error loading tool requests:', error);
      alert.error('Error', 'Failed to load tool requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, requestNumber: string) => {
    const confirmed = await alert.confirm(
      'Approve Tool Request', 
      `Approve request ${requestNumber} and all its tools?`
    );
    if (!confirmed) return;

    try {
      await api.post(`/tool-requests/${id}/approve`);
      alert.success('Success', `Request ${requestNumber} approved`);
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: number, requestNumber: string) => {
    const reason = await alert.prompt('Reject Request', `Enter rejection reason for ${requestNumber}:`);
    if (!reason) return;

    try {
      await api.post(`/tool-requests/${id}/reject`, { reason });
      alert.success('Success', `Request ${requestNumber} rejected`);
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to reject request');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      ISSUED: 'bg-green-100 text-green-800 border-green-300',
      PARTIAL_ISSUED: 'bg-orange-100 text-orange-800 border-orange-300',
      RETURN_PENDING: 'bg-purple-100 text-purple-800 border-purple-300',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🛠️ Tool Requests</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage tool requests from your team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Requests</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3">
              <Wrench className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-5 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
            </div>
            <div className="bg-yellow-500 rounded-full p-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Approved</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.approved}</p>
            </div>
            <div className="bg-green-500 rounded-full p-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-5 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Rejected</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{stats.rejected}</p>
            </div>
            <div className="bg-red-500 rounded-full p-3">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Tool Requests</h2>
          <p className="text-sm text-gray-600 mt-1">Click on a request to view details</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tool requests found</p>
              <p className="text-sm text-gray-400 mt-1">Requests will appear here when submitted</p>
            </div>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="hover:bg-gray-50 transition-colors">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedId === req.id ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-blue-600">{req.request_number}</span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(req.request_status)}`}>
                            {req.request_status}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                            {req.items_count} {req.items_count === 1 ? 'Tool' : 'Tools'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">{req.work_order_number}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            <span>{req.requested_by_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(req.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {req.request_status === 'PENDING' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(req.id, req.request_number)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id, req.request_number)}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {expandedId === req.id && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Requested Tools
                        </h3>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {req.items?.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tool_code}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{item.tool_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.quantity}</td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.issued_quantity > 0 ? (
                                      <span className={`font-semibold ${
                                        item.issued_quantity === item.quantity ? 'text-green-600' : 'text-orange-600'
                                      }`}>
                                        {item.issued_quantity}
                                      </span>
                                    ) : req.request_status === 'ISSUED' || req.request_status === 'PARTIAL_ISSUED' ? (
                                      <span className="text-red-600 font-semibold">0</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.condition_on_return ? (
                                      <div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                                          item.condition_on_return === 'DAMAGED' || item.condition_on_return === 'LOST' 
                                            ? 'bg-red-100 text-red-800 border border-red-300' 
                                            : item.condition_on_return === 'GOOD' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {(item.condition_on_return === 'DAMAGED' || item.condition_on_return === 'LOST') && '🚨 '}
                                          {item.condition_on_return}
                                        </span>
                                        {item.damage_notes && (
                                          <div className="text-xs text-red-700 font-medium mt-1 bg-red-50 px-2 py-1 rounded">
                                            {item.damage_notes}
                                          </div>
                                        )}
                                        {item.penalty_cost && Number(item.penalty_cost) > 0 && (
                                          <div className="text-xs text-red-700 font-bold mt-1">
                                            Cost: ${Number(item.penalty_cost).toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    ) : req.request_status === 'COMPLETED' ? (
                                      <span className="text-gray-400">Not recorded</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {(req.approved_at || req.rejected_at) && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Status Information</h3>
                          {req.approved_at && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Approved by:</span> {req.approved_by_name} on {formatDate(req.approved_at)}
                            </div>
                          )}
                          {req.rejected_at && (
                            <div className="space-y-1">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Rejected by:</span> {req.rejected_by_name} on {formatDate(req.rejected_at)}
                              </div>
                              {req.rejection_reason && (
                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                  <span className="font-medium">Reason:</span> {req.rejection_reason}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
