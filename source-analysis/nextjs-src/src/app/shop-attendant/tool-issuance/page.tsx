'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Package, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, User, Calendar, FileText, ArrowRight, ArrowLeft } from 'lucide-react';

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
  work_order_number: string;
  requested_by_name: string;
  request_status: string;
  items_count: number;
  items: ToolItem[];
  created_at: string;
  approved_at?: string;
  issued_at?: string;
}

export default function ShopAttendantToolIssuancePage() {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [issueData, setIssueData] = useState<Record<number, any>>({});
  const [returnData, setReturnData] = useState<Record<number, any>>({});
  const [stats, setStats] = useState({ approved: 0, issued: 0, returnPending: 0, total: 0 });
  const [reversingId, setReversingId] = useState<number | null>(null);
  const [issueDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      console.log('=== LOADING TOOL REQUESTS ===');
      const response = await api.get('/tool-requests');
      console.log('Raw API response:', response.data);
      
      const data = response.data.data || [];
      console.log('All tool requests:', data);
      console.log('Total requests:', data.length);
      
      const filtered = data.filter((r: ToolRequest) => 
        ['APPROVED', 'ISSUED', 'PARTIAL_ISSUED', 'RETURN_PENDING'].includes(r.request_status)
      );
      
      console.log('Filtered requests (APPROVED/ISSUED/PARTIAL_ISSUED/RETURN_PENDING):', filtered);
      console.log('Filtered count:', filtered.length);
      
      // Check for TR-2026-0001 specifically
      const targetRequest = data.find((r: ToolRequest) => r.request_number === 'TR-2026-0001');
      if (targetRequest) {
        console.log('Found TR-2026-0001:', targetRequest);
        console.log('Status:', targetRequest.request_status);
        console.log('Is in filtered list?', filtered.some((r: ToolRequest) => r.request_number === 'TR-2026-0001'));
      } else {
        console.log('TR-2026-0001 NOT FOUND in API response');
      }
      
      setRequests(filtered);
      
      setStats({
        total: filtered.length,
        approved: filtered.filter(r => r.request_status === 'APPROVED').length,
        issued: filtered.filter(r => ['ISSUED', 'PARTIAL_ISSUED'].includes(r.request_status)).length,
        returnPending: filtered.filter(r => r.request_status === 'RETURN_PENDING').length
      });
    } catch (error) {
      console.error('Error loading tool requests:', error);
      alert.error('Error', 'Failed to load tool requests');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (request: ToolRequest) => {
    const items = request.items.map(item => ({
      item_id: item.id,
      tool_id: item.tool_id,
      issued_quantity: issueData[item.id]?.quantity ?? item.quantity,
      condition_on_issue: issueData[item.id]?.condition || 'GOOD',
      issue_notes: issueData[item.id]?.notes || null
    }));

    console.log('=== TOOL ISSUANCE DEBUG ===');
    console.log('Request ID:', request.id);
    console.log('Request Number:', request.request_number);
    console.log('Items to issue:', items);
    console.log('Issue data state:', issueData);

    try {
      const response = await api.post(`/tool-requests/${request.id}/issue`, { items });
      console.log('Issue response:', response.data);
      alert.success('Success', `Tools issued for ${request.request_number}`);
      setIssuingId(null);
      setExpandedId(null);
      setIssueData({});
      await loadRequests();
    } catch (error: any) {
      console.error('Issue error:', error);
      console.error('Error response:', error.response?.data);
      alert.error('Error', error.response?.data?.message || 'Failed to issue tools');
    }
  };

  const handleReturn = async (request: ToolRequest) => {
    // Only process items that were actually issued (issued_quantity > 0)
    const issuedItems = request.items.filter(item => Number(item.issued_quantity) > 0);
    
    // Validate required fields
    for (const item of issuedItems) {
      const condition = returnData[item.id]?.condition || 'GOOD';
      const cost = returnData[item.id]?.penalty || 0;
      
      if ((condition === 'DAMAGED' || condition === 'LOST') && (!cost || cost <= 0)) {
        alert.error('Validation Error', `Cost is required for ${item.tool_name} marked as ${condition}`);
        return;
      }
    }
    
    const items = issuedItems.map(item => ({
      item_id: item.id,
      tool_id: item.tool_id,
      condition_on_return: returnData[item.id]?.condition || 'GOOD',
      damage_notes: returnData[item.id]?.notes || null,
      penalty_cost: returnData[item.id]?.penalty || 0
    }));

    try {
      await api.post(`/tool-requests/${request.id}/return`, { items });
      alert.success('Success', `Tools returned for ${request.request_number}`);
      setReturningId(null);
      setExpandedId(null);
      setReturnData({});
      await loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to return tools');
    }
  };

  const handleReverse = async (request: ToolRequest) => {
    const confirmed = await alert.confirm(
      'Reverse Tool Issuance',
      `Are you sure you want to reverse the issuance for ${request.request_number}? This will reset the request to APPROVED status and allow reissuing.`
    );
    
    if (!confirmed) return;

    try {
      await api.post(`/tool-requests/${request.id}/reverse`);
      alert.success('Success', `Issuance reversed for ${request.request_number}. Request is now APPROVED and ready to be reissued.`);
      await loadRequests();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to reverse issuance');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
      ISSUED: 'bg-green-100 text-green-800 border-green-300',
      PARTIAL_ISSUED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      RETURN_PENDING: 'bg-orange-100 text-orange-800 border-orange-300'
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
          <h1 className="text-3xl font-bold text-gray-900">📦 Tool Issuance & Returns</h1>
          <p className="text-sm text-gray-600 mt-1">Issue approved tools and process returns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Ready to Issue</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.approved}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Currently Issued</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.issued}</p>
            </div>
            <div className="bg-green-500 rounded-full p-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-5 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Pending Return</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{stats.returnPending}</p>
            </div>
            <div className="bg-orange-500 rounded-full p-3">
              <ArrowLeft className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Total Active</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-purple-500 rounded-full p-3">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Active Tool Requests</h2>
          <p className="text-sm text-gray-600 mt-1">Click to expand and process issuance or returns</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {requests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No active requests</p>
              <p className="text-sm text-gray-400 mt-1">Approved requests will appear here</p>
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

                    {req.request_status === 'APPROVED' && issuingId !== req.id && (
                      <button
                        onClick={() => {
                          setIssuingId(req.id);
                          setExpandedId(req.id);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Issue Tools
                      </button>
                    )}
                    {(req.request_status === 'ISSUED' || req.request_status === 'PARTIAL_ISSUED') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReverse(req)}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reverse
                        </button>
                        <button
                          onClick={() => {
                            setReturningId(req.id);
                            setExpandedId(req.id);
                          }}
                          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Process Return
                        </button>
                      </div>
                    )}
                    {req.request_status === 'RETURN_PENDING' && returningId !== req.id && (
                      <button
                        onClick={() => {
                          setReturningId(req.id);
                          setExpandedId(req.id);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Process Return
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === req.id && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                    <div className="mt-4">
                      {issuingId === req.id ? (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Issue Tools
                          </h3>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <label className="block text-xs font-medium text-blue-700 mb-1">Issue Date & Time</label>
                            <input
                              type="datetime-local"
                              value={issueDate}
                              readOnly
                              disabled
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-100 text-blue-900 font-semibold cursor-not-allowed"
                            />
                            <p className="text-xs text-blue-600 mt-1">⚠️ Issue date is automatically set by the system</p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Qty</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {req.items?.map((item) => {
                                  const condition = issueData[item.id]?.condition || 'GOOD';
                                  const isNonIssuable = ['DAMAGED', 'UNDER_MAINTENANCE', 'NOT_AVAILABLE'].includes(condition);
                                  const currentQty = issueData[item.id]?.quantity ?? item.quantity;
                                  
                                  return (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="font-medium text-gray-900">{item.tool_name}</div>
                                      <div className="text-xs text-gray-500">{item.tool_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.quantity}</td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        value={isNonIssuable ? 0 : currentQty}
                                        readOnly={isNonIssuable}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          if (val <= item.quantity) {
                                            setIssueData({...issueData, [item.id]: {...issueData[item.id], quantity: val}});
                                          }
                                        }}
                                        className={`w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 ${isNonIssuable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={condition}
                                        onChange={(e) => {
                                          const newCondition = e.target.value;
                                          const newData = {...issueData[item.id], condition: newCondition};
                                          if (['DAMAGED', 'UNDER_MAINTENANCE', 'NOT_AVAILABLE'].includes(newCondition)) {
                                            newData.quantity = 0;
                                          }
                                          setIssueData({...issueData, [item.id]: newData});
                                        }}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="GOOD">Good</option>
                                        <option value="FAIR">Fair</option>
                                        <option value="DAMAGED">Damaged</option>
                                        <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                                        <option value="NOT_AVAILABLE">Not Available</option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        placeholder="Reason for partial/non-issue..."
                                        onChange={(e) => setIssueData({...issueData, [item.id]: {...issueData[item.id], notes: e.target.value}})}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                      />
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleIssue(req)}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                            >
                              Confirm Issue
                            </button>
                            <button
                              onClick={() => setIssuingId(null)}
                              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : returningId === req.id ? (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Process Return
                          </h3>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Qty</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Damage Notes</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost ($) *</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {req.items?.filter(item => Number(item.issued_quantity) > 0).map((item) => {
                                  const condition = returnData[item.id]?.condition || 'GOOD';
                                  const requiresCost = condition === 'DAMAGED' || condition === 'LOST';
                                  
                                  return (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="font-medium text-gray-900">{item.tool_name}</div>
                                      <div className="text-xs text-gray-500">{item.tool_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{item.issued_quantity}</td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={condition}
                                        onChange={(e) => setReturnData({...returnData, [item.id]: {...returnData[item.id], condition: e.target.value}})}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="GOOD">Good</option>
                                        <option value="FAIR">Fair</option>
                                        <option value="DAMAGED">Damaged</option>
                                        <option value="LOST">Lost</option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="text"
                                        value={returnData[item.id]?.notes || ''}
                                        placeholder="Notes..."
                                        onChange={(e) => setReturnData({...returnData, [item.id]: {...returnData[item.id], notes: e.target.value}})}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={returnData[item.id]?.penalty || ''}
                                        onChange={(e) => setReturnData({...returnData, [item.id]: {...returnData[item.id], penalty: parseFloat(e.target.value) || 0}})}
                                        placeholder={requiresCost ? 'Required' : '0.00'}
                                        className={`w-24 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                                          requiresCost ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                        }`}
                                      />
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {req.items?.some(item => Number(item.issued_quantity) > 0 && (returnData[item.id]?.condition === 'DAMAGED' || returnData[item.id]?.condition === 'LOST')) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-sm text-yellow-800">
                                <span className="font-semibold">* Cost is required</span> for tools marked as DAMAGED or LOST
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReturn(req)}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                            >
                              Confirm Return
                            </button>
                            <button
                              onClick={() => setReturningId(null)}
                              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Tool Items
                          </h3>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {req.items?.map((item, idx) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="font-medium text-gray-900">{item.tool_name}</div>
                                      <div className="text-xs text-gray-500">{item.tool_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm">
                                      {item.issued_quantity > 0 ? (
                                        <span className={`font-semibold ${
                                          item.issued_quantity === item.quantity ? 'text-green-600' : 'text-orange-600'
                                        }`}>
                                          {item.issued_quantity}
                                        </span>
                                      ) : (
                                        <span className="text-red-600 font-semibold">0</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {item.condition_on_issue ? (
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                                          item.condition_on_issue === 'GOOD' ? 'bg-green-100 text-green-800' :
                                          item.condition_on_issue === 'FAIR' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {item.condition_on_issue}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {item.issue_notes || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
