'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Search, Filter, Play, Pause, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function MyWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [filteredWOs, setFilteredWOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    loadWorkOrders();
  }, []);

  useEffect(() => {
    filterWorkOrders();
  }, [searchTerm, statusFilter, priorityFilter, workOrders]);

  const loadWorkOrders = async () => {
    try {
      const res = await api.get('/work-orders?assigned_to=me');
      console.log('Work orders response:', res.data);
      setWorkOrders(res.data?.data || []);
    } catch (error: any) {
      console.error('Failed to load work orders:', error);
      alert.error('Error', error?.response?.data?.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const filterWorkOrders = () => {
    let filtered = [...workOrders];
    
    if (searchTerm) {
      filtered = filtered.filter(wo =>
        wo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wo => wo.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(wo => wo.priority === priorityFilter);
    }
    
    setFilteredWOs(filtered);
  };

  const handleStartWork = async (id: number) => {
    try {
      await api.post(`/work-orders/${id}/start`);
      alert.success('Success', 'Work started');
      loadWorkOrders();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to start work');
    }
  };

  const handleCompleteWork = async (id: number) => {
    try {
      await api.post(`/work-orders/${id}/complete`);
      alert.success('Success', 'Work completed');
      loadWorkOrders();
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to complete work');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white">
          <h1 className="text-lg font-semibold mb-2">My Work Orders</h1>
          <p className="text-blue-100">{filteredWOs.length} work orders assigned to you</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Work Orders List */}
        <div className="space-y-3">
          {filteredWOs.map((wo) => (
            <div key={wo.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{wo.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(wo.priority)}`}>
                      {wo.priority?.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                      {wo.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>WO #{wo.work_order_number}</span>
                    <span>•</span>
                    <span>{wo.description}</span>
                    <span>•</span>
                    <span>Type: <span className="font-medium capitalize text-gray-900">{wo.type}</span></span>
                    <span>•</span>
                    <span>Est: <span className="font-medium text-gray-900">{wo.estimated_hours || 0}h</span></span>
                    <span>•</span>
                    <span>Actual: <span className="font-medium text-gray-900">{wo.actual_hours ? `${parseFloat(wo.actual_hours).toFixed(2)}h` : '0h'}</span></span>
                    <span>•</span>
                    <span>Start: <span className="font-medium text-gray-900">{wo.planned_start ? formatDate(wo.planned_start) : 'N/A'}</span></span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 self-start">
                  <Link
                    href={`/technician/my-work-orders/${wo.id}`}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap"
                  >
                    View Details
                  </Link>
                  {wo.status === 'assigned' && (
                    <button
                      onClick={() => handleStartWork(wo.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-1 text-sm whitespace-nowrap"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button
                      onClick={() => handleCompleteWork(wo.id)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-1 text-sm whitespace-nowrap"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredWOs.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Work Orders Found</h3>
            <p className="text-gray-500">No work orders match your current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
