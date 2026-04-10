'use client';

import { useState, useEffect } from 'react';
import { Wrench, Clock, AlertCircle, CheckCircle, Play, Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { formatDateTime } from '@/lib/dateUtils';

export default function TechnicianWorkOrders() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [filteredWOs, setFilteredWOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ assigned: 0, in_progress: 0, completed: 0 });

  useEffect(() => {
    loadWorkOrders();
  }, []);

  useEffect(() => {
    let filtered = workOrders;
    if (searchTerm) {
      filtered = filtered.filter(wo =>
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wo => wo.status === statusFilter);
    }
    setFilteredWOs(filtered);
  }, [workOrders, searchTerm, statusFilter]);

  const loadWorkOrders = async () => {
    try {
      const res = await api.get('/work-orders');
      const wos = res.data?.data || [];
      setWorkOrders(wos);
      setFilteredWOs(wos);
      
      setStats({
        assigned: wos.filter((w: any) => w.status === 'assigned').length,
        in_progress: wos.filter((w: any) => w.status === 'in_progress').length,
        completed: wos.filter((w: any) => w.status === 'completed').length
      });
    } catch (error) {
      alert.error('Error', 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'on_hold': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1">My Work Orders</h1>
              <p className="text-blue-100">Assigned tasks and maintenance work</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-100 mb-1">Assigned</p>
                  <p className="text-lg font-semibold">{stats.assigned}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-white/60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-100 mb-1">In Progress</p>
                  <p className="text-lg font-semibold">{stats.in_progress}</p>
                </div>
                <Clock className="w-8 h-8 text-white/60" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-100 mb-1">Completed</p>
                  <p className="text-lg font-semibold">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-white/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by title, WO number, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Work Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl p-6 h-64 shadow-sm" />
            ))
          ) : filteredWOs.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm">
              <Wrench className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Work Orders Found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredWOs.map((wo) => (
              <div
                key={wo.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-l-4 border-blue-500 cursor-pointer"
                onClick={() => window.location.href = `/technician/work-orders/${wo.id}/execute`}
              >
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                        {wo.title || 'Untitled Work Order'}
                      </h3>
                      <p className="text-sm font-mono text-gray-500">#{wo.work_order_number}</p>
                    </div>
                    {wo.is_breakdown && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                        🚨 BREAKDOWN
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {wo.description || wo.technical_description || 'No description'}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(wo.priority)}`}>
                      {wo.priority?.toUpperCase() || 'MEDIUM'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(wo.status)}`}>
                      {wo.status?.replace('_', ' ').toUpperCase() || 'ASSIGNED'}
                    </span>
                    {wo.trade_activity && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-medium border border-gray-300">
                        {wo.trade_activity}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-4 h-4" />
                      {wo.estimated_hours ? `${wo.estimated_hours}h` : 'N/A'}
                    </div>
                    {wo.status === 'completed' || wo.status === 'closed' ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md font-semibold text-sm">
                        ✓ Completed
                      </span>
                    ) : (
                      <button className="px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-sm inline-flex items-center gap-2 shadow-lg">
                        <Play className="w-4 h-4" />
                        Execute
                      </button>
                    )}
                  </div>

                  {/* Created Date */}
                  {wo.created_at && (
                    <p className="text-xs text-gray-400">
                      Created: {formatDateTime(wo.created_at)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
