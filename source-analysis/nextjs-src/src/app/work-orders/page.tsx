'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionSection from '@/components/guards/PermissionSection';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { formatDate } from '@/lib/dateUtils';
import { Search, Filter, Plus, Eye, Play, CheckCircle, Wrench, Clock, User, X } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  acknowledged: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  on_hold: 'bg-orange-100 text-orange-800 border-orange-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  inspected: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-gray-200 text-gray-600 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const PRIORITY_COLORS = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  urgent: 'bg-red-100 text-red-800 border-red-300'
};

export default function UnifiedWorkOrdersPage() {
  const router = useRouter();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      let endpoint = '/work-orders';
      
      // Fetch based on permissions
      if (hasPermission('work_orders.view_all')) {
        endpoint = '/work-orders'; // All work orders
      } else if (hasPermission('work_orders.view_own')) {
        endpoint = '/work-orders?assigned_to=me'; // Only own work orders
      } else if (hasPermission('work_orders.view_team')) {
        endpoint = '/work-orders?team=my'; // Team work orders
      }
      
      const response = await api.get(endpoint);
      const orders = response.data?.data || [];
      setWorkOrders(orders);
      
      // Calculate stats
      const calculatedStats = {
        total: orders.length,
        draft: orders.filter((wo: any) => wo.status === 'draft').length,
        assigned: orders.filter((wo: any) => wo.status === 'assigned').length,
        in_progress: orders.filter((wo: any) => wo.status === 'in_progress').length,
        completed: orders.filter((wo: any) => wo.status === 'completed').length
      };
      setStats(calculatedStats);
    } catch (error: any) {
      console.error('Failed to load work orders:', error);
      alert.error('Error', error?.response?.data?.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (id: number) => {
    try {
      await api.post(`/work-orders/${id}/start`);
      alert.success('Success', 'Work started successfully');
      loadWorkOrders();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to start work');
    }
  };

  const handleCompleteWork = async (id: number) => {
    try {
      await api.post(`/work-orders/${id}/complete`);
      alert.success('Success', 'Work completed successfully');
      loadWorkOrders();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to complete work');
    }
  };

  // Filter work orders
  const filteredOrders = workOrders.filter(wo => {
    if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && wo.type !== typeFilter && wo.work_order_type !== typeFilter) return false;
    if (searchTerm && !wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !wo.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Work Orders</h1>
            <p className="text-blue-100">
              {hasPermission('work_orders.view_all') ? 'All work orders' : 
               hasPermission('work_orders.view_team') ? 'Team work orders' : 
               'My assigned work orders'}
            </p>
          </div>
          <PermissionSection permissions={['work_orders.create']}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Work Order
            </button>
          </PermissionSection>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm">Draft</p>
              <p className="text-2xl font-bold">{stats.draft}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm">Assigned</p>
              <p className="text-2xl font-bold">{stats.assigned}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm">In Progress</p>
              <p className="text-2xl font-bold">{stats.in_progress}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="breakdown">Breakdown</option>
            <option value="preventive">Preventive</option>
            <option value="corrective">Corrective</option>
            <option value="inspection">Inspection</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setTypeFilter('all');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Work Orders List */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedOrders.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Work Orders Found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first work order to get started'}
              </p>
              <PermissionSection permissions={['work_orders.create']}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Work Order
                </button>
              </PermissionSection>
            </div>
          ) : (
            paginatedOrders.map((wo) => (
              <div
                key={wo.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                onClick={() => router.push(`/work-orders/${wo.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{wo.title}</h3>
                      <p className="text-sm text-gray-500">WO #{wo.work_order_number}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{wo.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS]}`}>
                      {wo.status === 'in_progress' ? 'IN PROGRESS' : wo.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${PRIORITY_COLORS[wo.priority as keyof typeof PRIORITY_COLORS]}`}>
                      {wo.priority?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {wo.created_at ? formatDate(wo.created_at) : 'N/A'}
                    </span>
                    <div className="flex gap-2">
                      <PermissionSection permissions={['work_orders.execute']}>
                        {wo.status === 'assigned' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartWork(wo.id);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-1 text-sm"
                          >
                            <Play className="w-4 h-4" />
                            Start
                          </button>
                        )}
                        {wo.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteWork(wo.id);
                            }}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-1 text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </button>
                        )}
                      </PermissionSection>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/work-orders/${wo.id}`);
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold inline-flex items-center gap-1 text-sm border border-blue-200"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {paginatedOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Work Orders Found</h3>
              <p className="text-gray-500">Adjust your filters or create a new work order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {wo.work_order_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{wo.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{wo.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${PRIORITY_COLORS[wo.priority as keyof typeof PRIORITY_COLORS]}`}>
                          {wo.priority?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS]}`}>
                          {wo.status === 'in_progress' ? 'IN PROGRESS' : wo.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wo.assigned_to_name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wo.created_at ? formatDate(wo.created_at) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/work-orders/${wo.id}`)}
                            className="text-blue-600 hover:text-blue-900 font-semibold"
                          >
                            View
                          </button>
                          <PermissionSection permissions={['work_orders.execute']}>
                            {wo.status === 'assigned' && (
                              <button
                                onClick={() => handleStartWork(wo.id)}
                                className="text-green-600 hover:text-green-900 font-semibold"
                              >
                                Start
                              </button>
                            )}
                            {wo.status === 'in_progress' && (
                              <button
                                onClick={() => handleCompleteWork(wo.id)}
                                className="text-purple-600 hover:text-purple-900 font-semibold"
                              >
                                Complete
                              </button>
                            )}
                          </PermissionSection>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} work orders
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
