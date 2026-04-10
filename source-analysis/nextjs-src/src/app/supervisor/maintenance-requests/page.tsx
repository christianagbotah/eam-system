'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import BulkActions from '@/components/BulkActions';
import AdvancedFilters from '@/components/AdvancedFilters';
import { Eye, CheckCircle, XCircle, Send, Clock, User, AlertCircle, TrendingUp, Archive } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import RequestDetailsModal from '@/components/RequestDetailsModal';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import RBACGuard from '@/components/RBACGuard';

export default function SupervisorMaintenanceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'assign'>('approve');
  const [actionData, setActionData] = useState({ notes: '', planner_id: '', planner_type: 'engineering', reason: '' });
  const [formData, setFormData] = useState({
    title: '',
    machine_down_status: 'No',
    item_type: 'machine',
    asset_id: '',
    asset_name: '',
    location: '',
    requested_by: '',
    department_id: ''
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [planners, setPlanners] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(20);

  useEffect(() => {
    loadData();
    loadPlanners();
    loadMachines();
    loadUsers();
    loadDepartments();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (formData.asset_id) {
      const machine = machines.find(m => m.id == formData.asset_id);
      setSelectedMachine(machine);
    } else {
      setSelectedMachine(null);
    }
  }, [formData.asset_id, machines]);

  // Trigger re-render when planner_type changes
  useEffect(() => {
    console.log('Planner type changed to:', actionData.planner_type);
    console.log('Filtered planners count:', getFilteredPlanners().length);
  }, [actionData.planner_type]);

  const loadData = async () => {
    try {
      const hasFilters = Object.keys(filters).length > 0;
      const response = hasFilters
        ? await SecureMaintenanceAPI.getFilteredRequests(filters)
        : await SecureMaintenanceAPI.getRequests();
      const data = response?.data || [];
      setRequests(data);
      setTotalPages(Math.ceil(data.length / perPage));
      
      const statsData = {
        total: data.length,
        pending: data.filter((r: any) => r.status === 'pending').length,
        approved: data.filter((r: any) => r.status === 'approved' || r.status === 'converted').length,
        rejected: data.filter((r: any) => r.status === 'rejected').length
      };
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      // Error handling is done in SecureAPI
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters: any) => {
    setLoading(true);
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setLoading(true);
    setFilters({});
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map(r => r.id));
    }
  };

  const loadPlanners = async () => {
    try {
      const response = await api.get('/users?role=planner');
      console.log('All planners loaded:', response.data?.data);
      setPlanners(response.data?.data || []);
    } catch (error) {
      console.error('Error loading planners:', error);
    }
  };

  const getFilteredPlanners = () => {
    if (!actionData.planner_type) return [];
    
    const filtered = planners.filter(p => {
      const dept = departments.find(d => d.id == p.department_id);
      const deptName = (dept?.department_name || dept?.name || '').toLowerCase();
      
      if (actionData.planner_type === 'engineering') {
        return deptName.includes('engineering') || deptName.includes('maintenance') || deptName.includes('technical');
      } else if (actionData.planner_type === 'production') {
        return deptName.includes('production') || deptName.includes('manufacturing') || deptName.includes('operations');
      }
      return false;
    });
    
    return filtered;
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data?.data || []);
      setFilteredUsers(response.data?.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data?.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const filterUsersByDepartment = (departmentId: string) => {
    if (!departmentId) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u => u.department_id == departmentId));
    }
  };

  const loadMachines = async () => {
    setLoadingMachines(true);
    try {
      const response = await api.get('/machines');
      setMachines(response.data?.data || []);
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setLoadingMachines(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', machine_down_status: 'No', item_type: 'machine', asset_id: '', asset_name: '', location: '', requested_by: '', department_id: '' });
    setSelectedMachine(null);
    setUserSearchTerm('');
    setShowUserDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const requestData = {
        title: formData.title,
        description: '',
        machine_down_status: formData.item_type === 'machine' ? formData.machine_down_status : 'No',
        item_type: formData.item_type,
        asset_id: formData.item_type === 'machine' ? formData.asset_id || null : null,
        asset_name: formData.item_type === 'manual' ? formData.asset_name : null,
        location: formData.location || null,
        requested_by: formData.requested_by || undefined,
        department_id: formData.department_id || undefined
      };

      await SecureMaintenanceAPI.createRequest(requestData);
      setShowCreateModal(false);
      alert.success('Success', 'Request created successfully!');
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Request error:', error);
      // Error handling is done in SecureAPI, just log here
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = (request: any, type: 'approve' | 'reject' | 'assign') => {
    setViewingRequest(request);
    setActionType(type);
    setActionData({ notes: '', planner_id: '', planner_type: 'engineering', reason: '' });
    setShowActionModal(true);
  };

  const handleMarkSatisfactory = async (request: any) => {
    alert.confirm(
      'Mark Satisfactory',
      'Are you sure the work done is satisfactory?',
      async () => {
        try {
          await api.post(`/maintenance-requests/${request.id}/mark-satisfactory`);
          alert.success('Success', 'Request marked as satisfactory');
          loadData();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to mark satisfactory');
        }
      }
    );
  };

  const executeAction = async () => {
    if (!viewingRequest) return;

    try {
      switch (actionType) {
        case 'approve':
          await SecureMaintenanceAPI.approveRequest(viewingRequest.id);
          break;
        case 'reject':
          await SecureMaintenanceAPI.rejectRequest(viewingRequest.id, { reason: actionData.reason });
          break;
        case 'assign':
          // For assign, we need to use regular API since it's not in SecureMaintenanceAPI yet
          await api.post(`/maintenance-requests/${viewingRequest.id}/assign-planner`, {
            planner_id: actionData.planner_id,
            planner_type: actionData.planner_type,
            notes: actionData.notes
          });
          break;
      }

      alert.success('Success', `Request ${actionType === 'assign' ? 'assigned' : actionType + 'd'} successfully`);
      setShowActionModal(false);
      loadData();
    } catch (error: any) {
      // Error handling is done in SecureAPI
      console.error('Action error:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': case 'supervisor_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'assigned_to_planner': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <RBACGuard module="maintenance_requests" action="view">
      <div className="p-4 space-y-4">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Supervisor Dashboard</h1>
            <p className="text-indigo-100">Manage and review maintenance requests</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/supervisor/maintenance-requests/archive"
              className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold inline-flex items-center gap-2 border-2 border-white/30"
            >
              <Archive className="w-4 h-4" />
              View Archive
            </a>
            <button
              onClick={() => { setShowCreateModal(true); resetForm(); }}
              className="bg-white text-indigo-600 px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-50 transition-all font-semibold shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Request
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Requests</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Pending Review</p>
                <p className="text-lg font-semibold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Approved</p>
                <p className="text-lg font-semibold">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Rejected</p>
                <p className="text-lg font-semibold">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {requests.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === requests.length && requests.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Select All</span>
            </label>
          )}
        </div>
        <AdvancedFilters onFilter={handleFilter} onClear={handleClearFilters} />
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl p-6 h-32" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No pending requests require your attention.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-2 py-1.5 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === requests.length && requests.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Request #</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Title</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Asset/Item</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Location</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Machine</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Created</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.slice((currentPage - 1) * perPage, currentPage * perPage).map((req) => (
                    <tr key={req.id} className={(req.workflow_status === 'pending' || req.workflow_status === 'supervisor_review') ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(req.id)}
                          onChange={() => toggleSelection(req.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-[11px] font-mono text-gray-900">#{req.request_number}</td>
                      <td className="px-2 py-1.5 text-[11px] font-medium text-gray-900 max-w-xs truncate">{req.title}</td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600">{req.asset_name || req.machine_name || 'N/A'}</td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600">{req.location || 'N/A'}</td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(req.workflow_status || 'pending')}`}>
                          {formatStatus(req.workflow_status || 'pending')}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        {req.item_type === 'machine' && req.machine_down_status === 'Yes' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">🔴 DOWN</span>
                        )}
                        {req.item_type === 'machine' && req.machine_down_status === 'No' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">✅ OK</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-gray-600">{formatDate(req.created_at)}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setViewingRequest(req); setShowDetailsModal(true); }} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-[10px] font-medium">
                            View
                          </button>
                          {(req.workflow_status === 'pending' || req.workflow_status === 'supervisor_review') && (
                            <>
                              <button onClick={() => handleAction(req, 'approve')} className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100 text-[10px] font-medium">
                                Approve
                              </button>
                              <button onClick={() => handleAction(req, 'reject')} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-[10px] font-medium">
                                Reject
                              </button>
                            </>
                          )}
                          {req.workflow_status === 'approved' && (
                            <button onClick={() => handleAction(req, 'assign')} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 text-[10px] font-medium">
                              Assign
                            </button>
                          )}
                          {req.workflow_status === 'completed' && (
                            <button onClick={() => handleMarkSatisfactory(req)} className="px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded hover:bg-teal-100 text-[10px] font-medium">
                              Mark OK
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, requests.length)} of {requests.length} requests
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 text-sm border rounded-md ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <RequestDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={viewingRequest}
        getStatusColor={getStatusColor}
      />

      {/* Action Modal */}
      <FormModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Request`}
        size="md"
      >
        <div className="space-y-4">
          {actionType === 'reject' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason *</label>
              <textarea
                value={actionData.reason}
                onChange={(e) => setActionData({...actionData, reason: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
                placeholder="Explain why this request is being rejected..."
                required
              />
            </div>
          )}
          
          {actionType === 'assign' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Planner Type *</label>
                <SearchableSelect
                  value={actionData.planner_type}
                  onChange={(value) => setActionData({...actionData, planner_type: value, planner_id: ''})}
                  options={[
                    { id: 'engineering', label: 'Engineering Planner', sublabel: 'Handles technical maintenance' },
                    { id: 'production', label: 'Production Planner', sublabel: 'Handles production-related tasks' }
                  ]}
                  placeholder="Select Planner Type"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Planner *</label>
                <SearchableSelect
                  key={actionData.planner_type}
                  value={actionData.planner_id}
                  onChange={(value) => setActionData({...actionData, planner_id: value})}
                  options={getFilteredPlanners().map(planner => ({
                    id: planner.id,
                    label: planner.full_name || planner.username,
                    sublabel: planner.email
                  }))}
                  placeholder={getFilteredPlanners().length === 0 ? 'No planners available for this type' : 'Choose a planner...'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={actionData.notes}
                  onChange={(e) => setActionData({...actionData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes for the planner..."
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={executeAction}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl ${
                actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </button>
            <button
              onClick={() => setShowActionModal(false)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </FormModal>

      {/* Bulk Actions */}
      <BulkActions 
        selectedIds={selectedIds} 
        onSuccess={() => { loadData(); setSelectedIds([]); }} 
        onClearSelection={() => setSelectedIds([])} 
      />

      {/* Create Request Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create Maintenance Request"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department *</label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => {
                  const deptId = e.target.value;
                  setFormData({...formData, department_id: deptId, requested_by: ''});
                  setUserSearchTerm('');
                  filterUsersByDepartment(deptId);
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department_name || dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Request For (User)</label>
              <input
                type="text"
                value={userSearchTerm}
                onFocus={() => setShowUserDropdown(true)}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                onChange={(e) => {
                  const searchValue = e.target.value;
                  setUserSearchTerm(searchValue);
                  setShowUserDropdown(true);
                  
                  if (searchValue.trim()) {
                    const user = filteredUsers.find(u => 
                      (u.full_name || u.username).toLowerCase() === searchValue.toLowerCase()
                    );
                    if (user) {
                      setFormData({...formData, requested_by: user.id});
                    }
                  } else {
                    setFormData({...formData, requested_by: ''});
                  }
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type to search user..."
                autoComplete="off"
                disabled={!formData.department_id}
              />
              {showUserDropdown && formData.department_id && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredUsers.filter(u => 
                    !userSearchTerm || (u.full_name || u.username).toLowerCase().includes(userSearchTerm.toLowerCase())
                  ).length > 0 ? (
                    filteredUsers.filter(u => 
                      !userSearchTerm || (u.full_name || u.username).toLowerCase().includes(userSearchTerm.toLowerCase())
                    ).map(user => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setUserSearchTerm(user.full_name || user.username);
                          setFormData({...formData, requested_by: user.id});
                          setShowUserDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{user.full_name || user.username}</div>
                        <div className="text-sm text-gray-500">{user.role} - {user.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No users in this department</div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Select department first, then search user</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Request Title *</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief title of the maintenance issue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose Option *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, item_type: 'machine'})}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  formData.item_type === 'machine'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Select Machine
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, item_type: 'manual'})}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  formData.item_type === 'manual'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Enter Item Manually
              </button>
            </div>
          </div>
          {formData.item_type === 'machine' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asset *</label>
                  <SearchableSelect
                    value={formData.asset_id}
                    onChange={(value) => setFormData({...formData, asset_id: value})}
                    options={machines.map(machine => ({
                      id: machine.id,
                      label: machine.machine_name || machine.name || `Machine #${machine.id}`,
                      sublabel: machine.machine_code || machine.location
                    }))}
                    placeholder={loadingMachines ? 'Loading...' : 'Select Asset'}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Machine is Down</label>
                  <div className="flex items-center h-[42px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.machine_down_status === 'Yes'}
                        onChange={(e) => setFormData({...formData, machine_down_status: e.target.checked ? 'Yes' : 'No'})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">{formData.machine_down_status}</span>
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Location or area"
                  />
                </div>
              </div>
              {selectedMachine?.criticality && (
                <p className="text-sm text-gray-600">
                  Machine Criticality: <span className={`font-semibold ${selectedMachine.criticality === 'High' ? 'text-red-600' : selectedMachine.criticality === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {selectedMachine.criticality}
                  </span>
                </p>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={formData.asset_name}
                  onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter asset name..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Location or area"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition-all font-semibold disabled:opacity-50 shadow-lg"
            >
              {submitting ? 'Saving...' : 'Create Request'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); resetForm(); }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>
    </div>
    </RBACGuard>
  );
}
