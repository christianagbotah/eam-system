"use client";

import { useState, useEffect } from 'react';
import { FiPlus, FiFilter, FiDownload, FiEdit, FiTrash2, FiClock, FiAlertCircle, FiCheckCircle, FiTool } from 'react-icons/fi';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface MaintenanceOrder {
  id: number;
  order_number: string;
  order_type: string;
  title: string;
  priority: string;
  status: string;
  asset_id?: number;
  assigned_to_name?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_hours?: number;
  actual_cost?: number;
  created_at: string;
}

interface DashboardStats {
  total_orders: number;
  by_status: Array<{ status: string; count: number }>;
  by_priority: Array<{ priority: string; count: number }>;
  overdue_count: number;
  completed_this_month: number;
  avg_completion_hours: number;
}

export default function MaintenanceOrdersPage() {
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    order_type: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchOrders();
  }, [filters]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/v1/eam/maintenance-orders/dashboard');
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.order_type) params.append('order_type', filters.order_type);

      const response = await fetch(`/api/v1/eam/maintenance-orders?${params}`);
      const data = await response.json();
      if (data.status === 'success') {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const params = new URLSearchParams({ format, ...filters });
      window.open(`/api/v1/eam/maintenance-orders/export?${params}`, '_blank');
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
      emergency: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-blue-100 text-blue-800',
      approved: 'bg-cyan-100 text-cyan-800',
      assigned: 'bg-indigo-100 text-indigo-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Maintenance Orders</h1>
          <p className="text-gray-600">Enterprise-grade maintenance order management system</p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                  <p className="text-lg font-semibold mt-2">{stats.total_orders}</p>
                </div>
                <FiTool className="text-4xl text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Overdue</p>
                  <p className="text-lg font-semibold mt-2">{stats.overdue_count}</p>
                </div>
                <FiAlertCircle className="text-4xl text-orange-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed (Month)</p>
                  <p className="text-lg font-semibold mt-2">{stats.completed_this_month}</p>
                </div>
                <FiCheckCircle className="text-4xl text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Avg. Hours</p>
                  <p className="text-lg font-semibold mt-2">{stats.avg_completion_hours.toFixed(1)}</p>
                </div>
                <FiClock className="text-4xl text-purple-200" />
              </div>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="emergency">Emergency</option>
              </select>

              <select
                value={filters.order_type}
                onChange={(e) => setFilters({ ...filters, order_type: e.target.value })}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="breakdown">Breakdown</option>
                <option value="inspection">Inspection</option>
                <option value="modification">Modification</option>
                <option value="calibration">Calibration</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-2 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
              >
                <FiDownload /> Export CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                <FiPlus /> Create Order
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Assigned To</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Scheduled</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No maintenance orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2.5 text-sm font-medium text-blue-600">
                        {order.order_number}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-900">{order.title}</td>
                      <td className="px-3 py-2.5 text-sm">
                        <span className="capitalize">{order.order_type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                          {order.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">
                        {order.assigned_to_name || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">
                        {order.scheduled_start ? formatDate(order.scheduled_start) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800">
                            <FiEdit />
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
