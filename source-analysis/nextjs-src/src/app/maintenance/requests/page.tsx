'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiSearch } from 'react-icons/fi';
import { Wrench, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  workflow_status?: string;
  priority: string;
  machine_down_status: string;
  item_type: string;
  asset_id: number;
  asset_name: string;
  machine_name?: string;
  location: string;
  requested_by: number;
  requested_by_name: string;
  department_id: number;
  department_name: string;
  request_number?: string;
  created_at: string;
}

export default function MaintenanceRequestsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [machines, setMachines] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });

  const canCreate = hasPermission('maintenance_requests.create');
  const canEdit = hasPermission('maintenance_requests.edit');
  const canDelete = hasPermission('maintenance_requests.delete');
  const canConvert = hasPermission('work_orders.create');

  useEffect(() => {
    fetchRequests();
    fetchMachines();
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    let filtered = requests;
    if (filters.search) {
      filtered = filtered.filter(req =>
        req.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        req.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        req.location?.toLowerCase().includes(filters.search.toLowerCase()) ||
        req.request_number?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.status) {
      filtered = filtered.filter(req => (req.workflow_status || req.status) === filters.status);
    }
    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, filters]);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/maintenance-requests');
      const data = response.data?.data || [];
      setRequests(data);
      setStats({
        total: data.length,
        pending: data.filter((r: any) => (r.workflow_status || r.status) === 'pending').length,
        in_progress: data.filter((r: any) => (r.workflow_status || r.status) === 'in_progress').length,
        completed: data.filter((r: any) => (r.workflow_status || r.status) === 'completed').length
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await api.get('/assets-unified');
      const allAssets = response.data?.data || [];
      setMachines(allAssets.filter((a: any) => a.asset_type === 'machine'));
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const usersData = response.data?.data || [];
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete || !confirm('Delete this maintenance request?')) return;
    try {
      await api.delete(`/maintenance/requests/${id}`);
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleConvertToWorkOrder = (request: MaintenanceRequest) => {
    if (!canConvert) return;
    router.push(`/work-orders/create?from_request=${request.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': case 'assigned_to_planner': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': case 'work_order_created': return 'bg-blue-100 text-blue-800';
      case 'completed': case 'satisfactory': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const currentRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Wrench className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.in_progress}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-blue-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Maintenance Requests</h1>
            <p className="text-blue-100">Submit and track maintenance requests</p>
          </div>
          {canCreate && (
            <button onClick={() => { setShowModal(true); setEditingRequest(null); }} className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2 font-semibold">
              <FiPlus /> Create Request
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, location, number..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 px-3 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned_to_planner">Assigned to Planner</option>
            <option value="work_order_created">Work Order Created</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="satisfactory">Satisfactory</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {currentRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No maintenance requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{req.title}</h3>
                        {req.request_number && (
                          <span className="text-xs font-mono text-gray-500">#{req.request_number}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{req.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(req.workflow_status || req.status)}`}>
                          {(req.workflow_status || req.status).replace(/_/g, ' ')}
                        </span>
                        {req.priority && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(req.priority)}`}>
                            {req.priority}
                          </span>
                        )}
                        {req.machine_down_status === 'Yes' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            🔴 Machine Down
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><span className="font-medium">Asset:</span> {req.machine_name || req.asset_name || 'N/A'}</div>
                        <div><span className="font-medium">Location:</span> {req.location || 'N/A'}</div>
                        <div><span className="font-medium">Requested By:</span> {req.requested_by_name || 'N/A'}</div>
                        <div><span className="font-medium">Department:</span> {req.department_name || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {canConvert && (req.workflow_status === 'pending' || req.workflow_status === 'assigned_to_planner' || req.status === 'pending') && (
                        <button onClick={() => handleConvertToWorkOrder(req)} className="text-green-600 hover:text-green-900" title="Convert to Work Order">
                          <FiFileText size={18} />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => { setEditingRequest(req); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-900" title="Edit">
                          <FiEdit2 size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-900" title="Delete">
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <RequestModal
          request={editingRequest}
          machines={machines}
          users={users}
          filteredUsers={filteredUsers}
          setFilteredUsers={setFilteredUsers}
          departments={departments}
          onClose={() => { setShowModal(false); setEditingRequest(null); }}
          onSuccess={() => { fetchRequests(); setShowModal(false); setEditingRequest(null); }}
        />
      )}
    </div>
  );
}

function RequestModal({ request, machines, users, filteredUsers, setFilteredUsers, departments, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: request?.title || '',
    description: request?.description || '',
    item_type: request?.item_type || 'machine',
    asset_id: request?.asset_id || '',
    asset_name: request?.asset_name || '',
    location: request?.location || '',
    machine_down_status: request?.machine_down_status || 'No',
    requested_by: request?.requested_by || '',
    department_id: request?.department_id || ''
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (request) {
      const selectedUser = users.find((u: any) => u.id == request.requested_by);
      setUserSearchTerm(selectedUser ? (selectedUser.full_name || selectedUser.username) : '');
      if (request.department_id) {
        filterUsersByDepartment(request.department_id);
      }
    }
  }, [request]);

  const filterUsersByDepartment = (departmentId: string) => {
    if (!departmentId) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter((u: any) => u.department_id == departmentId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requestData = {
        title: formData.title,
        description: formData.description,
        machine_down_status: formData.item_type === 'machine' ? formData.machine_down_status : 'No',
        item_type: formData.item_type,
        asset_id: formData.item_type === 'machine' ? formData.asset_id || null : null,
        asset_name: formData.item_type === 'manual' ? formData.asset_name : null,
        location: formData.location || null,
        requested_by: formData.requested_by || undefined,
        department_id: formData.department_id || undefined
      };

      if (request) {
        await api.put(`/maintenance/requests/${request.id}`, requestData);
      } else {
        await api.post('/maintenance-requests', requestData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Request error:', error);
      alert(error.response?.data?.message || 'Failed to save request');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{request ? 'Edit' : 'Create'} Maintenance Request</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    setFormData({ ...formData, department_id: deptId, requested_by: '' });
                    setUserSearchTerm('');
                    filterUsersByDepartment(deptId);
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>{dept.department_name || dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested By</label>
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
                      const user = filteredUsers.find((u: any) =>
                        (u.full_name || u.username).toLowerCase() === searchValue.toLowerCase()
                      );
                      if (user) {
                        setFormData({ ...formData, requested_by: user.id });
                      }
                    } else {
                      setFormData({ ...formData, requested_by: '' });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Type to search user..."
                  autoComplete="off"
                  disabled={!formData.department_id}
                />
                {showUserDropdown && formData.department_id && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredUsers.filter((u: any) =>
                      !userSearchTerm || (u.full_name || u.username).toLowerCase().includes(userSearchTerm.toLowerCase())
                    ).length > 0 ? (
                      filteredUsers.filter((u: any) =>
                        !userSearchTerm || (u.full_name || u.username).toLowerCase().includes(userSearchTerm.toLowerCase())
                      ).map((user: any) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setUserSearchTerm(user.full_name || user.username);
                            setFormData({ ...formData, requested_by: user.id });
                            setShowUserDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
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
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, item_type: 'machine' })}
                className={`px-4 py-2 rounded-lg font-medium ${formData.item_type === 'machine' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-600'}`}
              >
                Select Machine
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, item_type: 'manual' })}
                className={`px-4 py-2 rounded-lg font-medium ${formData.item_type === 'manual' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-600'}`}
              >
                Enter Manually
              </button>
            </div>
            {formData.item_type === 'machine' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Machine *</label>
                  <select
                    value={formData.asset_id}
                    onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Machine</option>
                    {machines.map((machine: any) => (
                      <option key={machine.id} value={machine.id}>{machine.asset_name || machine.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Machine Down?</label>
                  <select
                    value={formData.machine_down_status}
                    onChange={(e) => setFormData({ ...formData, machine_down_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  value={formData.asset_name}
                  onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {request ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
