'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Package, Clock, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface ToolRequestItem {
  id: number;
  tool_id: number;
  tool_name: string;
  tool_code: string;
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
  work_order_number: string;
  request_status: string;
  created_at: string;
  returned_at?: string;
  items: ToolRequestItem[];
}

export default function TechnicianToolRequestsPage() {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      console.log('=== LOADING TECHNICIAN TOOL REQUESTS ===');
      const response = await api.get('/tool-requests');
      const data = response.data.data || [];
      console.log('Technician tool requests loaded:', data);
      console.log('Total requests found:', data.length);
      
      // Log user info from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Current user data:', userData);
      
      setRequests(data);
    } catch (error) {
      console.error('Error loading tool requests:', error);
      alert.error('Error', 'Failed to load tool requests');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturn = async (requestId: number) => {
    const confirmed = await alert.confirm('Mark Return', 'Mark these tools for return?');
    if (!confirmed) return;

    try {
      await api.post(`/tool-requests/${requestId}/mark-return`);
      alert.success('Success', 'Tools marked for return. Awaiting shop attendant verification.');
      loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to mark return');
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🛠️ My Tool Requests</h1>
        <p className="text-sm text-gray-600 mt-1">View your tool request history and return status</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tool requests yet</p>
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
                        {expandedId === req.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-blue-600">{req.request_number}</span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(req.request_status)}`}>
                            {req.request_status}
                          </span>
                          <span className="text-sm text-gray-600">WO: {req.work_order_number}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>Requested: {formatDate(req.created_at)}</span>
                          </div>
                          {req.returned_at && (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Returned: {formatDate(req.returned_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(req.request_status === 'ISSUED' || req.request_status === 'PARTIAL_ISSUED') && (
                      <button
                        onClick={() => handleMarkReturn(req.id)}
                        className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Mark Return
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === req.id && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Tool Items</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {req.items?.map((item) => {
                              const isPartial = Number(item.issued_quantity) > 0 && Number(item.issued_quantity) < Number(item.quantity);
                              const notIssued = Number(item.issued_quantity) === 0;
                              const isDamaged = item.condition_on_return === 'DAMAGED';
                              const isLost = item.condition_on_return === 'LOST';
                              const hasPenalty = item.penalty_cost && Number(item.penalty_cost) > 0;

                              return (
                                <tr key={item.id}>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="font-medium text-gray-900">{item.tool_name}</div>
                                    <div className="text-xs text-gray-500">{item.tool_code}</div>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.quantity}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className={`font-semibold ${
                                      notIssued ? 'text-red-600' :
                                      isPartial ? 'text-orange-600' :
                                      'text-green-600'
                                    }`}>
                                      {item.issued_quantity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.condition_on_issue ? (
                                      <div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                                          item.condition_on_issue === 'GOOD' ? 'bg-green-100 text-green-800' :
                                          item.condition_on_issue === 'FAIR' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {item.condition_on_issue}
                                        </span>
                                        {item.issue_notes && (
                                          <div className="text-xs text-gray-600 mt-1">{item.issue_notes}</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {item.condition_on_return ? (
                                      <div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                                          isDamaged || isLost ? 'bg-red-100 text-red-800 border border-red-300' :
                                          item.condition_on_return === 'GOOD' ? 'bg-green-100 text-green-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {isDamaged && '🚨 '}
                                          {isLost && '🚨 '}
                                          {item.condition_on_return}
                                        </span>
                                        {item.damage_notes && (
                                          <div className="text-xs text-red-700 font-medium mt-1 bg-red-50 px-2 py-1 rounded">
                                            {item.damage_notes}
                                          </div>
                                        )}
                                        {hasPenalty && (
                                          <div className="text-xs text-red-700 font-bold mt-1">
                                            Penalty: ${Number(item.penalty_cost).toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    ) : notIssued ? (
                                      <span className="text-gray-400">Not issued</span>
                                    ) : req.request_status === 'COMPLETED' ? (
                                      <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">GOOD</span>
                                    ) : (
                                      <span className="text-gray-400">Pending return</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
