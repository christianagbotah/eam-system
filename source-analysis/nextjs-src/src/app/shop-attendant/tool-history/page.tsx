'use client';

import { useState, useEffect } from 'react';
import { Calendar, Search, Download, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '@/lib/api';

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
  work_order_id: number;
  work_order_number: string;
  work_order_title?: string;
  technician_name: string;
  request_status: string;
  created_at: string;
  issued_at?: string;
  returned_at?: string;
  items: ToolRequestItem[];
}

interface FlatToolRequest {
  id: number;
  request_id: number;
  request_number: string;
  work_order_id: number;
  work_order_title: string;
  technician_name: string;
  tool_name: string;
  requested_quantity: number;
  issued_quantity: number;
  request_status: string;
  requested_at: string;
  issued_at: string;
  returned_at: string;
  return_condition: string;
  damage_notes: string;
  penalty_cost: number;
}

export default function ToolHistoryPage() {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, dateFilter]);

  const loadHistory = async () => {
    try {
      console.log('Loading tool history...');
      const response = await api.get('/tool-requests');
      console.log('Raw API response:', response.data);
      const rawRequests: ToolRequest[] = response.data.data || [];
      console.log('Total requests:', rawRequests.length);
      setRequests(rawRequests);
    } catch (error) {
      console.error('Error loading tool history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.work_order_title && req.work_order_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        req.items.some(item => item.tool_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(req => req.request_status === statusFilter);
    }

    if (dateFilter !== 'ALL') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'TODAY':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(req => new Date(req.created_at) >= filterDate);
          break;
        case 'WEEK':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(req => new Date(req.created_at) >= filterDate);
          break;
        case 'MONTH':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(req => new Date(req.created_at) >= filterDate);
          break;
      }
    }

    setFilteredRequests(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Request #', 'Date', 'Technician', 'Work Order', 'Tool', 'Requested', 'Issued', 'Status', 'Condition', 'Cost'];
    const csvData: any[] = [];
    
    filteredRequests.forEach(req => {
      req.items.forEach(item => {
        csvData.push([
          req.request_number,
          new Date(req.created_at).toLocaleDateString(),
          req.technician_name,
          req.work_order_title || req.work_order_number,
          item.tool_name,
          item.quantity,
          item.issued_quantity || 0,
          req.request_status,
          item.condition_on_return || 'N/A',
          item.penalty_cost || 0
        ]);
      });
    });

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'APPROVED': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'ISSUED': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'PARTIAL_ISSUED': { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      'RETURN_PENDING': { color: 'bg-purple-100 text-purple-800', icon: Clock },
      'COMPLETED': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      'REJECTED': { color: 'bg-red-100 text-red-800', icon: XCircle },
      'CANCELLED': { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['PENDING'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getConditionBadge = (condition: string) => {
    if (!condition) return null;
    
    const conditionConfig = {
      'GOOD': 'bg-green-100 text-green-800',
      'DAMAGED': 'bg-red-100 text-red-800',
      'LOST': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${conditionConfig[condition as keyof typeof conditionConfig] || 'bg-gray-100 text-gray-800'}`}>
        {condition}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tool Issuance History</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search technician, tool, or work order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIAL_ISSUED">Partial Issued</option>
            <option value="RETURN_PENDING">Return Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {filteredRequests.length} of {requests.length} requests
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Tool Request History</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tool requests found matching your filters.
            </div>
          ) : (
            filteredRequests.map((request) => {
              const isExpanded = expandedId === request.id;
              const totalRequested = request.items.reduce((sum, item) => sum + Number(item.quantity), 0);
              const totalIssued = request.items.reduce((sum, item) => sum + Number(item.issued_quantity || 0), 0);
              const totalPenalty = request.items.reduce((sum, item) => sum + Number(item.penalty_cost || 0), 0);
              
              return (
                <div key={request.id} className="hover:bg-gray-50 transition-colors">
                  <div 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <button className="text-gray-400 hover:text-gray-600">
                          {isExpanded ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-lg font-bold text-blue-600">{request.request_number}</span>
                            {getStatusBadge(request.request_status)}
                            <span className="text-sm text-gray-600"><span className="font-bold">WO:</span> {request.work_order_number}</span>
                            <span className="text-sm text-gray-600"><span className="font-bold">Date:</span> {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-sm text-gray-600"><span className="font-bold">Technician:</span> {request.technician_name}</span>
                            <span className="text-sm text-gray-600"><span className="font-bold">Tools:</span> {request.items.length}</span>
                            <span className="text-sm text-gray-600"><span className="font-bold">Qty:</span> {totalRequested} / {totalIssued}</span>
                            {totalPenalty > 0 && (
                              <span className="text-sm text-red-600 font-medium"><span className="font-bold">Penalty:</span> ${totalPenalty}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Tool Items</h4>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Condition</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Condition</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penalty</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {request.items.map((item) => {
                                const isPartial = Number(item.issued_quantity) > 0 && Number(item.issued_quantity) < Number(item.quantity);
                                const notIssued = Number(item.issued_quantity) === 0;
                                const isDamaged = item.condition_on_return === 'DAMAGED';
                                const isLost = item.condition_on_return === 'LOST';
                                const hasPenalty = item.penalty_cost && Number(item.penalty_cost) > 0;

                                return (
                                  <tr key={item.id} className={isDamaged || isLost ? 'bg-red-50' : ''}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tool_name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{item.tool_code}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`font-semibold ${
                                        notIssued ? 'text-red-600' :
                                        isPartial ? 'text-orange-600' :
                                        'text-green-600'
                                      }`}>
                                        {item.issued_quantity || 0}
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
                                        </div>
                                      ) : notIssued ? (
                                        <span className="text-gray-400">Not issued</span>
                                      ) : request.request_status === 'COMPLETED' ? (
                                        <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">GOOD</span>
                                      ) : (
                                        <span className="text-gray-400">Pending return</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {hasPenalty && (
                                        <span className="text-red-600 font-bold">
                                          ${Number(item.penalty_cost).toFixed(2)}
                                        </span>
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
