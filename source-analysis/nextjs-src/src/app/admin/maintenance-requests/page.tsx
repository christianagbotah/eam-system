'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import { Eye, Edit, Trash2, Clock, User, MapPin, AlertCircle } from 'lucide-react';
import RequestDetailsModal from '@/components/RequestDetailsModal';
import SearchableSelect from '@/components/SearchableSelect';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import RBACGuard from '@/components/RBACGuard';
import MaintenanceRequestCard from '@/components/MaintenanceRequestCard';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';

function MaintenanceRequestsContent() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);

  useEffect(() => {
    loadData();
    loadMachines();
    loadUsers();
    loadDepartments();
  }, []);

  useEffect(() => {
    let filtered = requests;
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }
    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, searchTerm, statusFilter]);

  useEffect(() => {
    if (formData.asset_id) {
      const machine = machines.find(m => m.id == formData.asset_id);
      setSelectedMachine(machine);
    } else {
      setSelectedMachine(null);
    }
  }, [formData.asset_id, machines]);

  const loadData = async () => {
    try {
      const response = await api.get('/maintenance-requests');
      setRequests(response.data?.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    setLoadingMachines(true);
    try {
      const response = await api.get('/assets-unified');
      const allAssets = response.data?.data || [];
      setMachines(allAssets.filter((a: any) => a.asset_type === 'machine'));
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setLoadingMachines(false);
    }
  };



  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      const usersData = response.data?.data || [];
      console.log('Loaded users:', usersData);
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const filterUsersByDepartment = (departmentId: string) => {
    if (!departmentId) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u => u.department_id == departmentId));
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

  const handleViewDetails = (request: any) => {
    setViewingRequest(request);
    setShowDetailsModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEdit = async (request: any) => {
    setEditingRequest(request);
    
    // Auto-populate user and department
    const selectedUser = users.find(u => u.id == request.requested_by);
    setUserSearchTerm(selectedUser ? (selectedUser.full_name || selectedUser.username) : '');
    
    // Filter users by department when editing
    if (request.department_id) {
      filterUsersByDepartment(request.department_id);
    }
    
    setFormData({
      title: request.title || '',
      description: request.description || '',
      machine_down_status: request.machine_down_status || 'No',
      item_type: request.item_type || 'machine',
      asset_id: request.asset_id || '',
      asset_name: request.asset_name || '',
      location: request.location || '',
      requested_by: request.requested_by || '',
      department_id: request.department_id || ''
    });
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    alert.confirm(
      'Delete Request',
      'Are you sure you want to delete this request? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/maintenance/requests/${id}`);
          alert.success('Deleted', 'Request deleted successfully');
          loadData();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to delete request');
        }
      }
    );
  };

  const handleConvertToWorkOrder = (request: any) => {
    router.push(`/planner/work-orders/create?from_request=${request.id}`);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', machine_down_status: 'No', item_type: 'machine', asset_id: '', asset_name: '', location: '', requested_by: '', department_id: '' });
    setEditingRequest(null);
    setUserSearchTerm('');
    setShowUserDropdown(false);
    setSelectedMachine(null);
  };

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
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
      
      if (editingRequest) {
        await api.put(`/maintenance/requests/${editingRequest.id}`, requestData);
        setShowModal(false);
        alert.success('Success', 'Request updated successfully!');
      } else {
        await api.post('/maintenance-requests', requestData);
        setShowModal(false);
        alert.success('Success', 'Request created successfully!');
      }
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Request error:', error);
      alert.error('Error', error.response?.data?.message || 'Failed to save request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Maintenance Requests</h1>
            <p className="text-blue-100">Submit and track maintenance requests</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setEditingRequest(null); }}
            className="bg-white text-blue-600 px-3 py-1.5 text-sm rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Request
          </button>
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingRequest ? 'Edit Maintenance Request' : 'Create Maintenance Request'}
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Request Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Detailed description of the maintenance issue"
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
                      label: machine.asset_name || machine.name || `Machine #${machine.id}`,
                      sublabel: machine.asset_code || machine.location
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
              {submitting ? 'Saving...' : (editingRequest ? 'Update Request' : 'Create Request')}
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, description, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl p-6 h-32" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-3 text-gray-300">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {currentRequests.map((req) => (
                  <MaintenanceRequestCard
                    key={req.id}
                    request={req}
                    onView={handleViewDetails}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onConvertToWorkOrder={handleConvertToWorkOrder}
                    getStatusColor={getStatusColor}
                    showConvertButton={true}
                  />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRequests.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      <RequestDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={viewingRequest}
        getStatusColor={getStatusColor}
      />
    </div>
  );
}

export default function MaintenanceRequestsPage() {
  return (
    <RBACGuard module="maintenance_requests" action="view">
      <MaintenanceRequestsContent />
    </RBACGuard>
  );
}
