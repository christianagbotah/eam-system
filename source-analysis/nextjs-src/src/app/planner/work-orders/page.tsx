'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Wrench, Eye, Clock, User, Filter, Download, Plus, TrendingUp, X } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import CreateWorkOrderForm from '@/components/CreateWorkOrderForm';

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, draft: 0, assigned: 0, in_progress: 0, completed: 0 });
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      console.log('Loading work orders...');
      const woRes = await api.get('/maintenance/work-orders');
      console.log('Work orders response:', woRes.data);
      
      if (woRes.data?.status === 'success') {
        const orders = woRes.data.data || [];
        setWorkOrders(orders);
        
        // Calculate stats from actual data
        const calculatedStats = {
          total: orders.length,
          draft: orders.filter((wo: any) => wo.status === 'draft').length,
          assigned: orders.filter((wo: any) => wo.status === 'assigned').length,
          in_progress: orders.filter((wo: any) => wo.status === 'in_progress').length,
          completed: orders.filter((wo: any) => wo.status === 'completed').length
        };
        setStats(calculatedStats);
      }
    } catch (error: any) {
      console.error('Load error:', error);
      console.error('Error response:', error?.response);
      alert.error('Error', error?.response?.data?.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      assigned: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeColor = (type: string) => {
    const colors: any = {
      breakdown: 'bg-red-100 text-red-800',
      preventive: 'bg-green-100 text-green-800',
      corrective: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const filteredOrders = workOrders.filter(wo => {
    if (filter !== 'all' && wo.status !== filter) return false;
    if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && wo.work_order_type !== typeFilter) return false;
    if (searchTerm && !wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !wo.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Work Orders</h1>
            <p className="text-purple-100">Manage and track maintenance work orders</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-xl hover:bg-purple-50 transition-all font-semibold shadow-lg inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/80 text-sm">Total</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/80 text-sm">Draft</p>
            <p className="text-lg font-semibold">{stats.draft}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/80 text-sm">Assigned</p>
            <p className="text-lg font-semibold">{stats.assigned}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/80 text-sm">In Progress</p>
            <p className="text-lg font-semibold">{stats.in_progress}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/80 text-sm">Completed</p>
            <p className="text-lg font-semibold">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'draft', 'assigned', 'in_progress', 'completed', 'closed'].map(status => (
              <button
                key={status}
                onClick={() => { setFilter(status); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  filter === status
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'in_progress' ? 'IN PROGRESS' : status.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'card' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Card View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Table View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search by title or WO number..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="breakdown">Breakdown</option>
            <option value="preventive">Preventive</option>
            <option value="corrective">Corrective</option>
            <option value="other">Other</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center justify-center bg-gray-50 rounded-lg px-4 py-2">
            Showing {paginatedOrders.length} of {filteredOrders.length}
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-xl shadow-lg">
              <Wrench className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No work orders found</h3>
              <p className="text-gray-500">Create your first work order to get started</p>
            </div>
          ) : (
            paginatedOrders.map((wo) => (
              <div
                key={wo.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-gray-100 overflow-hidden"
                onClick={() => router.push(`/planner/work-orders/${wo.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{wo.title}</h3>
                      <p className="text-sm text-gray-500">WO #{wo.work_order_number}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{wo.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(wo.status)}`}>
                      {wo.status === 'in_progress' ? 'IN PROGRESS' : wo.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    {wo.work_order_type && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(wo.work_order_type)}`}>
                        {wo.work_order_type.toUpperCase()}
                      </span>
                    )}
                    {wo.is_breakdown && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                        🚨 BREAKDOWN
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {wo.created_at && (
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(wo.created_at)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/planner/work-orders/${wo.id}`);
                      }}
                      className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-semibold inline-flex items-center gap-1 text-sm border border-purple-200"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Wrench className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No work orders found</h3>
              <p className="text-gray-500">Adjust your filters or create a new work order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">WO Number</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/planner/work-orders/${wo.id}`)}>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{wo.work_order_number}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-900">
                        <div className="font-medium">{wo.title}</div>
                        <div className="text-gray-500 text-xs truncate max-w-xs">{wo.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {wo.work_order_type && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(wo.work_order_type)}`}>
                            {wo.work_order_type}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          wo.priority === 'critical' || wo.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          wo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(wo.status)}`}>
                          {wo.status === 'in_progress' ? 'IN PROGRESS' : wo.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">
                        {wo.created_at ? formatDate(wo.created_at) : '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/planner/work-orders/${wo.id}`);
                          }}
                          className="text-purple-600 hover:text-purple-900 font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
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
      {!loading && filteredOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                    className={`px-3 py-2 rounded-lg font-medium ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
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
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold">Create Work Order</h2>
                <p className="text-purple-100 text-sm">Fill in the details below</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <CreateWorkOrderForm
                onSuccess={() => {
                  setShowCreateModal(false);
                  loadData();
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
