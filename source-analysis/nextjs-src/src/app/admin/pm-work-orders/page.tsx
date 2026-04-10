'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PmWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchWorkOrders();
  }, [filter]);

  const fetchWorkOrders = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/v1/eam/pm-work-orders'
        : `/api/v1/eam/pm-work-orders?status=${filter}`;
      
      const response = await fetch(url);
      const data = response.data;
      setWorkOrders(data.data || []);
    } catch (error) {
      console.error('API Error:', error);
      showToast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const generateWorkOrders = async () => {
    const loadingToast = showToast.loading('Generating work orders...');
    try {
      const response = await api.post('/pm-work-orders/generate', formData);
      const data = response.data;
      showToast.dismiss(loadingToast);
      showToast.success(data.message || 'Work orders generated successfully');
      fetchWorkOrders();
    } catch (error) {
      console.error('Generate Error:', error);
      showToast.dismiss(loadingToast);
      showToast.error('Failed to generate work orders');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">PM Work Orders</h1>
        <button
          onClick={generateWorkOrders}
          className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Generate Work Orders
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'pending', 'assigned', 'in_progress', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg capitalize ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : workOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 mb-4">No work orders found</p>
          <button onClick={generateWorkOrders} className="text-blue-600 hover:text-blue-700">
            Generate Work Orders →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {workOrders.map((wo: any) => (
            <Link
              key={wo.id}
              href={`/admin/pm-work-orders/${wo.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4"
              style={{ borderLeftColor: wo.priority === 'critical' ? '#ef4444' : wo.priority === 'high' ? '#f97316' : '#3b82f6' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{wo.work_order_number}</h3>
                  <p className="text-sm text-gray-600">{wo.part_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(wo.status)}`}>
                  {wo.status.replace('_', ' ')}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-4">{wo.title}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Priority:</span>
                  <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(wo.priority)}`}>
                    {wo.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date:</span>
                  <span className="font-medium">{new Date(wo.due_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium">{wo.estimated_duration}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
