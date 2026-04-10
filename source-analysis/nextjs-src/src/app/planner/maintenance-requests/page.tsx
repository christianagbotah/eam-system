'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import LoadingModal from '@/components/ui/LoadingModal';
import { Wrench, User, Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, FileText, Archive } from 'lucide-react';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import RequestDetailsModal from '@/components/RequestDetailsModal';
import SearchableSelect from '@/components/SearchableSelect';
import MultiSelectTags from '@/components/MultiSelectTags';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import Pagination from '@/components/Pagination';

export default function PlannerMaintenanceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<any[]>([]);
  const [assignType, setAssignType] = useState<'technician' | 'supervisor'>('technician');
  const [skills, setSkills] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);

  const [showAddToolModal, setShowAddToolModal] = useState(false);

  const [newTool, setNewTool] = useState({ tool_name: '', category: '', quantity_available: 1 });

  const [toolCategories, setToolCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [workOrderData, setWorkOrderData] = useState({
    department_ids: [] as (string | number)[],
    technicians: [] as any[],
    supervisors: [] as any[],
    required_parts: [] as (string | number)[],
    required_tools: [] as (string | number)[],
    team_leader_id: '',
    scheduled_date: '',
    estimated_hours: '',
    estimated_hours_display: '',
    work_type: 'corrective',
    priority: 'medium',
    is_breakdown: false,
    technical_description: '',
    trade_activity: 'mechanical',
    delivery_date_required: '',
    safety_notes: '',
    notes: ''
  });
  const [stats, setStats] = useState({ assigned: 0, converted: 0, total: 0 });
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing...');

  useEffect(() => {
    loadData();
    loadUsers();
    loadSkills();
    loadDepartments();
    loadResources();
  }, []);

  useEffect(() => {
    let filtered = requests;
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.asset_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.workflow_status === statusFilter);
    }
    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      // Ensure we have a valid token before making the request
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        setLoading(false);
        window.location.href = '/login';
        return;
      }
      
      console.log('Loading planner requests...');
      const response = await api.get('/maintenance-requests/my-queue?role=planner');
      console.log('Planner response:', response.data);
      
      // Validate response structure
      if (!response.data || response.data.status !== 'success') {
        console.error('Invalid response structure:', response.data);
        alert.error('Error', 'Failed to load requests: Invalid response');
        setRequests([]);
        setLoading(false);
        return;
      }
      
      const data = response.data?.data || [];
      console.log('Planner requests count:', data.length);
      console.log('Planner requests:', data);
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Response data is not an array:', data);
        setRequests([]);
        setLoading(false);
        return;
      }
      
      setRequests(data);
      
      setStats({
        total: data.length,
        assigned: data.filter((r: any) => r.workflow_status === 'assigned_to_planner').length,
        converted: data.filter((r: any) => r.workflow_status === 'work_order_created').length
      });
    } catch (error: any) {
      console.error('Error loading data:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        console.error('Authentication failed - redirecting to login');
        window.location.href = '/login';
      } else {
        alert.error('Error', error.response?.data?.message || 'Failed to load maintenance requests');
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?limit=1000');
      const users = response.data?.data || [];
      const sups = users.filter((u: any) => u.role === 'supervisor');
      
      console.log('Loaded all users:', users);
      console.log('User skills sample:', users[0]?.skills);
      console.log('Loaded supervisors:', sups);
      
      setAllUsers(users);
      setSupervisors(sups);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      const depts = response.data?.data || [];
      console.log('Loaded departments:', depts);
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  useEffect(() => {
    if (workOrderData.department_ids.length > 0) {
      const deptIds = workOrderData.department_ids.map(id => id.toString());
      console.log('Selected department IDs:', deptIds);
      console.log('All users:', allUsers);
      console.log('All supervisors:', supervisors);
      
      const filteredEmps = allUsers.filter(u => {
        console.log(`User ${u.name}: dept_id=${u.department_id}, match=${u.department_id && deptIds.includes(u.department_id.toString())}`);
        return u.department_id && deptIds.includes(u.department_id.toString());
      });
      
      const filteredSups = supervisors.filter(s => {
        console.log(`Supervisor ${s.name}: dept_id=${s.department_id}, match=${s.department_id && deptIds.includes(s.department_id.toString())}`);
        return s.department_id && deptIds.includes(s.department_id.toString());
      });
      
      console.log('Filtered employees:', filteredEmps);
      console.log('Filtered supervisors:', filteredSups);
      
      setFilteredEmployees(filteredEmps);
      setFilteredSupervisors(filteredSups);
    } else {
      setFilteredEmployees([]);
      setFilteredSupervisors([]);
    }
  }, [workOrderData.department_ids, allUsers, supervisors]);

  const loadResources = async () => {
    try {
      const [partsRes, toolsRes] = await Promise.all([
        api.get('/parts?limit=10000'),
        api.get('/tools?limit=10000')
      ]);
      const parts = partsRes.data?.data || [];
      const tools = toolsRes.data?.data || [];
      
      setSpareParts(parts);
      setTools(tools);
      
      const uniqueToolCats = [...new Set(tools.map((t: any) => t.category).filter(Boolean))];
      
      console.log('Tool categories loaded:', uniqueToolCats);
      
      setToolCategories(uniqueToolCats.length > 0 ? uniqueToolCats : ['Hand Tool', 'Power Tool', 'Measuring Tool', 'Safety Equipment']);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };


  const handleAddTool = async () => {
    try {
      const response = await api.post('/tools', newTool);
      const createdTool = response.data?.data;
      alert.success('Success', 'Tool added successfully');
      setShowAddToolModal(false);
      setNewTool({ tool_name: '', category: '', quantity_available: 1 });
      await loadResources();
      if (createdTool) {
        setWorkOrderData({...workOrderData, required_tools: [...workOrderData.required_tools, createdTool.id]});
      }
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to add tool');
    }
  };

  const loadSkills = async () => {
    try {
      const response = await api.get('/skills');
      setSkills(response.data?.data?.filter((s: any) => s.is_active) || []);
    } catch (error) {
      console.error('Error loading skills:', error);
    }
  };

  const handleMarkCompleted = async (request: any) => {
    alert.confirm(
      'Mark Completed',
      'Are you sure the work order is completed?',
      async () => {
        setProcessing(true);
        setProcessingMessage('Marking as completed...');
        try {
          await api.post(`/maintenance/requests/${request.id}/mark-completed`);
          alert.success('Success', 'Work order marked as completed');
          loadData();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to mark completed');
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  const handleCloseRequest = async (request: any) => {
    alert.confirm(
      'Close Request',
      'Are you sure you want to close this request? This action cannot be undone.',
      async () => {
        setProcessing(true);
        setProcessingMessage('Closing request...');
        try {
          await api.post(`/maintenance/requests/${request.id}/close`);
          alert.success('Success', 'Request closed successfully');
          loadData();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to close request');
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  const handleCreateWorkOrder = (request: any) => {
    setSelectedRequest(request);
    setWorkOrderData({
      department_ids: [],
      technicians: [],
      supervisors: [],
      required_parts: [],
      required_tools: [],
      team_leader_id: '',
      scheduled_date: '',
      estimated_hours: '',
      estimated_hours_display: '',
      work_type: 'corrective',
      priority: 'medium',
      is_breakdown: request.machine_down_status === 'Yes',
      technical_description: request.title || '',
      trade_activity: 'mechanical',
      delivery_date_required: '',
      safety_notes: '',
      notes: ''
    });
    setAssignType('technician');
    setShowWorkOrderModal(true);
  };

  const addSupervisor = () => {
    setWorkOrderData({
      ...workOrderData,
      supervisors: [...workOrderData.supervisors, { supervisor_id: '' }]
    });
  };

  const removeSupervisor = (index: number) => {
    setWorkOrderData({ ...workOrderData, supervisors: workOrderData.supervisors.filter((_, i) => i !== index) });
  };

  const updateSupervisor = (index: number, value: any) => {
    const newSupervisors = [...workOrderData.supervisors];
    newSupervisors[index] = { supervisor_id: value };
    setWorkOrderData({ ...workOrderData, supervisors: newSupervisors });
  };

  const addTechnician = () => {
    setWorkOrderData({
      ...workOrderData,
      technicians: [...workOrderData.technicians, { technician_id: '' }]
    });
  };

  const removeTechnician = (index: number) => {
    setWorkOrderData({ ...workOrderData, technicians: workOrderData.technicians.filter((_, i) => i !== index) });
  };

  const updateTechnician = (index: number, value: any) => {
    const newTechnicians = [...workOrderData.technicians];
    newTechnicians[index] = { technician_id: value };
    setWorkOrderData({ ...workOrderData, technicians: newTechnicians });
  };

  const executeCreateWorkOrder = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    setProcessingMessage('Creating work order...');
    try {
      const response = await api.post(`/maintenance/requests/${selectedRequest.id}/create-work-order`, workOrderData);
      alert.success('Success', `Work Order ${response.data?.data?.work_order_number} created successfully`);
      setShowWorkOrderModal(false);
      loadData();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to create work order');
    } finally {
      setProcessing(false);
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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'converted': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  return (
    <div className="p-4 space-y-4">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Planner Dashboard</h1>
            <p className="text-purple-100">Manage assigned maintenance requests</p>
          </div>
          <a
            href="/planner/maintenance-requests/archive"
            className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all font-semibold inline-flex items-center gap-2 border-2 border-white/30"
          >
            <Archive className="w-4 h-4" />
            View Archive
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Assigned</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Pending Conversion</p>
                <p className="text-lg font-semibold">{stats.assigned}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Converted to WO</p>
                <p className="text-lg font-semibold">{stats.converted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, number, machine, asset, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="assigned_to_planner">Pending Conversion</option>
              <option value="work_order_created">WO Created</option>
              <option value="completed">Completed</option>
              <option value="satisfactory">Satisfactory</option>
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
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No requests assigned to you at the moment.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {currentRequests.map((req) => (
                <div key={req.id} className={`rounded-lg p-3 hover:shadow-md transition-all duration-200 border-l-4 ${
                  req.workflow_status === 'assigned_to_planner' 
                    ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-500' 
                    : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-500'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{req.title}</h3>
                          <span className="text-[10px] font-mono text-gray-500">#{req.request_number}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          {req.item_type === 'machine' && req.machine_down_status === 'Yes' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-red-100 text-red-800 border-red-200">
                              🔴 DOWN
                            </span>
                          )}
                          {req.item_type === 'machine' && req.machine_down_status === 'No' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-green-100 text-green-800 border-green-200">
                              ✅ OK
                            </span>
                          )}
                          {req.location && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              📍 {req.location}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                            {formatDateTime(req.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {req.workflow_status === 'assigned_to_planner' && (
                        <>
                          <button
                            onClick={() => { setViewingRequest(req); setShowDetailsModal(true); }}
                            className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium inline-flex items-center gap-1 border border-blue-200"
                          >
                            <FileText className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={() => handleCreateWorkOrder(req)}
                            className="px-2 py-1 text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700 transition-all font-medium inline-flex items-center gap-1 shadow"
                          >
                            <Wrench className="w-3 h-3" />
                            Create WO
                          </button>
                        </>
                      )}
                      {req.workflow_status === 'satisfactory' && (
                        <>
                          <button
                            onClick={() => { setViewingRequest(req); setShowDetailsModal(true); }}
                            className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium inline-flex items-center gap-1 border border-blue-200"
                          >
                            <FileText className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={() => handleCloseRequest(req)}
                            className="px-2 py-1 text-[10px] bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors font-medium inline-flex items-center gap-1 border border-green-200"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Close
                          </button>
                        </>
                      )}
                      {req.workflow_status === 'work_order_created' && (
                        <>
                          <button
                            onClick={() => { setViewingRequest(req); setShowDetailsModal(true); }}
                            className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium inline-flex items-center gap-1 border border-blue-200"
                          >
                            <FileText className="w-3 h-3" />
                            View
                          </button>
                          <span className="px-2 py-1 text-[10px] bg-gray-100 text-gray-500 rounded font-medium inline-flex items-center gap-1 border border-gray-200">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        </>
                      )}
                      {req.workflow_status === 'completed' && (
                        <>
                          <button
                            onClick={() => { setViewingRequest(req); setShowDetailsModal(true); }}
                            className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium inline-flex items-center gap-1 border border-blue-200"
                          >
                            <FileText className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={() => handleMarkCompleted(req)}
                            className="px-2 py-1 text-[10px] bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors font-medium inline-flex items-center gap-1 border border-green-200"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Mark OK
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
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

      {/* Add Tool Modal */}
      <FormModal
        isOpen={showAddToolModal}
        onClose={() => setShowAddToolModal(false)}
        title="Add New Tool"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tool Name *</label>
            <input
              type="text"
              value={newTool.tool_name}
              onChange={(e) => setNewTool({...newTool, tool_name: e.target.value})}
              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter tool name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
            <select
              value={newTool.category}
              onChange={(e) => setNewTool({...newTool, category: e.target.value})}
              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select category</option>
              {toolCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity Available *</label>
            <input
              type="number"
              min="1"
              value={newTool.quantity_available}
              onChange={(e) => setNewTool({...newTool, quantity_available: parseInt(e.target.value) || 1})}
              className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleAddTool}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-bold shadow-lg"
            >
              Add Tool
            </button>
            <button
              onClick={() => setShowAddToolModal(false)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </FormModal>

      {/* Create Work Order Modal */}
      <FormModal
        isOpen={showWorkOrderModal}
        onClose={() => setShowWorkOrderModal(false)}
        title="Create Work Order"
        size="xl"
      >
        <div className="space-y-6">
          {/* Section 1: Request Information (Read-only) */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Section 1: Request Information</h3>
            {selectedRequest && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="font-semibold text-gray-700">Order No:</label>
                  <p className="text-gray-900">{selectedRequest.request_number}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Machine:</label>
                  <p className="text-gray-900">{selectedRequest.machine_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Location:</label>
                  <p className="text-gray-900">{selectedRequest.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Breakdown:</label>
                  <p className="text-gray-900">{selectedRequest.machine_down_status === 'Yes' ? '☑ Yes' : '☐ No'}</p>
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700">Problem Description:</label>
                  <p className="text-gray-900 bg-white p-3 rounded border">{selectedRequest.title}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Requested By:</label>
                  <p className="text-gray-900">{selectedRequest.requested_by_name}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Date Sent:</label>
                  <p className="text-gray-900">{formatDateTime(selectedRequest.created_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Work Order Details */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-purple-900 mb-6">🔧 Section 2: Work Order Details</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Work Order Type *</label>
                <select
                  value={workOrderData.work_type}
                  onChange={(e) => setWorkOrderData({...workOrderData, work_type: e.target.value, is_breakdown: e.target.value === 'breakdown'})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="breakdown">Breakdown</option>
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective/Project</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority *</label>
                <select
                  value={workOrderData.priority}
                  onChange={(e) => setWorkOrderData({...workOrderData, priority: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Trade Activity *</label>
                <select
                  value={workOrderData.trade_activity}
                  onChange={(e) => setWorkOrderData({...workOrderData, trade_activity: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="mechanical">Mechanical</option>
                  <option value="electrical">Electrical</option>
                  <option value="civil">Civil</option>
                  <option value="facility">Facility</option>
                  <option value="workshop">Workshop</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="lg:col-span-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Technical Description *</label>
                <textarea
                  value={workOrderData.technical_description}
                  onChange={(e) => setWorkOrderData({...workOrderData, technical_description: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Detailed technical description..."
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Scheduled Date</label>
                <input
                  type="datetime-local"
                  value={workOrderData.scheduled_date}
                  onChange={(e) => setWorkOrderData({...workOrderData, scheduled_date: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Date</label>
                <input
                  type="date"
                  value={workOrderData.delivery_date_required}
                  onChange={(e) => setWorkOrderData({...workOrderData, delivery_date_required: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Est. Hours</label>
                <input
                  type="text"
                  value={workOrderData.estimated_hours_display}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.includes(':')) {
                      const parts = value.split(':');
                      const hours = parseInt(parts[0] || '0');
                      const minutes = parseInt(parts[1] || '0');
                      const decimal = hours + (minutes / 60);
                      setWorkOrderData({...workOrderData, estimated_hours: decimal.toFixed(2), estimated_hours_display: value});
                    } else {
                      setWorkOrderData({...workOrderData, estimated_hours: value, estimated_hours_display: value});
                    }
                  }}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  placeholder="2.5 or 2:30"
                />
                <p className="text-xs text-gray-500 mt-1">Format: 2.5 or 2:30</p>
              </div>
            </div>
          </div>

          {/* Section 3: Resource Assignment */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-green-900 mb-6">👥 Section 3: Resource Assignment</h3>
            
            <div className="space-y-6">
              <div>
                <MultiSelectTags
                  label="Select Department(s)"
                  required
                  options={departments.map(d => ({ id: d.id, label: d.department_name || d.name }))}
                  value={workOrderData.department_ids}
                  onChange={(val) => setWorkOrderData({...workOrderData, department_ids: val, technicians: [], supervisors: []})}
                  placeholder="Select departments..."
                />
              </div>

              {workOrderData.department_ids.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Assign To *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignType('technician');
                          setWorkOrderData({...workOrderData, technicians: [], supervisors: []});
                        }}
                        className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                          assignType === 'technician'
                            ? 'border-green-600 bg-green-100 text-green-800'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        👥 Technician(s)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignType('supervisor');
                          setWorkOrderData({...workOrderData, technicians: [], supervisors: []});
                        }}
                        className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                          assignType === 'supervisor'
                            ? 'border-green-600 bg-green-100 text-green-800'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        👔 Supervisor(s)
                      </button>
                    </div>
                  </div>

                  {assignType === 'supervisor' ? (
                    <div className="space-y-3">
                      {workOrderData.supervisors.map((sup, index) => {
                        const selectedSupIds = workOrderData.supervisors.map(s => s.supervisor_id).filter(id => id !== '');
                        const availableSupervisors = filteredSupervisors.filter(s => 
                          !selectedSupIds.includes(s.id.toString()) || s.id.toString() === sup.supervisor_id
                        );
                        
                        return (
                          <div key={index} className="flex gap-2 w-full">
                            <div className="flex-1">
                              <SearchableSelect
                                value={sup.supervisor_id}
                                onChange={(val) => updateSupervisor(index, val)}
                                options={availableSupervisors.map(s => ({
                                  value: s.id,
                                  label: `${s.full_name || s.name || s.username} - ${s.email}`
                                }))}
                                placeholder="Select Supervisor..."
                                className="w-full"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSupervisor(index)}
                              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={addSupervisor}
                        disabled={workOrderData.supervisors.length > 0 && workOrderData.supervisors.some(s => !s.supervisor_id)}
                        className="w-full px-2 py-1 text-xs.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-semibold border-2 border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Add Supervisor
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workOrderData.technicians.map((tech, index) => {
                        const selectedTechIds = workOrderData.technicians.map(t => t.technician_id).filter(id => id !== '');
                        const availableEmployees = filteredEmployees.filter(e => 
                          !selectedTechIds.includes(e.id.toString()) || e.id.toString() === tech.technician_id
                        );
                        const selectedEmployee = filteredEmployees.find(e => e.id == tech.technician_id);
                        const employeeSkillName = selectedEmployee?.skills?.map((s: any) => s.skill_name).join(', ') || '';
                        
                        console.log('Selected employee:', selectedEmployee);
                        console.log('Employee skill:', employeeSkillName);
                        
                        return (
                          <div key={index} className="bg-white p-3 rounded-lg border-2 border-green-200 space-y-2">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <SearchableSelect
                                  value={tech.technician_id}
                                  onChange={(val) => updateTechnician(index, val)}
                                  options={availableEmployees.map(e => ({
                                    value: e.id,
                                    label: `${e.name || e.username} - ${e.email}`
                                  }))}
                                  placeholder="Select Technician..."
                                  className="w-full"
                                />
                              </div>
                              <label className="flex items-center gap-2 px-2.5 py-1.5 text-sm.5 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                                <input
                                  type="radio"
                                  name="team_leader"
                                  checked={workOrderData.team_leader_id === tech.technician_id}
                                  onChange={() => setWorkOrderData({...workOrderData, team_leader_id: tech.technician_id})}
                                  className="w-4 h-4 text-amber-600"
                                  disabled={!tech.technician_id}
                                />
                                <span className="text-sm font-semibold text-amber-900 whitespace-nowrap">Team Leader</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => removeTechnician(index)}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                              >
                                ✕
                              </button>
                            </div>
                            {tech.technician_id && selectedEmployee && (
                              <div className="px-2.5 py-1.5 text-sm bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-sm font-semibold text-blue-900">Trade/Skill: </span>
                                <span className="text-sm text-blue-800">{selectedEmployee.trade_skill_name || 'Not assigned'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={addTechnician}
                        disabled={workOrderData.technicians.length > 0 && workOrderData.technicians.some(t => !t.technician_id)}
                        className="w-full px-2 py-1 text-xs.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-semibold border-2 border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Add Technician
                      </button>
                      <p className="text-xs text-gray-600 italic bg-amber-50 border border-amber-200 rounded-lg p-2">💡 Tip: Select multiple technicians and designate one as team leader using the radio button.</p>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Required Spare Parts</label>
                  </div>
                  <MultiSelectTags
                    options={spareParts.map(p => ({ 
                      id: p.id, 
                      label: p.part_name || p.name,
                      image: p.image_url || p.image
                    }))}
                    value={workOrderData.required_parts}
                    onChange={(val) => setWorkOrderData({...workOrderData, required_parts: val})}
                    placeholder="Select spare parts..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Required Tools</label>
                    <button
                      type="button"
                      onClick={() => setShowAddToolModal(true)}
                      className="px-2 py-0.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-[10px] font-semibold inline-flex items-center gap-1"
                    >
                      + Add New
                    </button>
                  </div>
                  <MultiSelectTags
                    options={tools.map(t => ({ 
                      id: t.id, 
                      label: t.tool_name || t.name,
                      image: t.image_url || t.image
                    }))}
                    value={workOrderData.required_tools}
                    onChange={(val) => setWorkOrderData({...workOrderData, required_tools: val})}
                    placeholder="Select tools..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Safety & Notes */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4">⚠️ Section 4: Safety & Additional Notes</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Safety Precautions</label>
                <textarea
                  value={workOrderData.safety_notes}
                  onChange={(e) => setWorkOrderData({...workOrderData, safety_notes: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  placeholder="PPE requirements, safety procedures..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={workOrderData.notes}
                  onChange={(e) => setWorkOrderData({...workOrderData, notes: e.target.value})}
                  className="w-full px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  placeholder="Additional instructions for technicians..."
                />
              </div>
            </div>
          </div>

          {/* Future Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 className="font-bold text-gray-700 mb-1">👷 Section 5: Technician Report</h4>
              <p className="text-xs text-gray-600 italic">Filled after work completion</p>
            </div>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 className="font-bold text-gray-700 mb-1">✍️ Section 6: Authorization</h4>
              <p className="text-xs text-gray-600 italic">Signatures required</p>
            </div>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 className="font-bold text-gray-700 mb-1">📦 Section 7: Materials</h4>
              <p className="text-xs text-gray-600 italic">Store clerk section</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={executeCreateWorkOrder}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg hover:shadow-xl"
            >
              Create Work Order
            </button>
            <button
              onClick={() => setShowWorkOrderModal(false)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </FormModal>

      <LoadingModal isOpen={processing} message={processingMessage} />
    </div>
  );
}
