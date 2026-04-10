'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function WorkOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder();
    }
  }, [params.id]);

  const fetchWorkOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/work-orders/${params.id}`);
      setWorkOrder(response.data.data);
    } catch (error: any) {
      console.error('Error fetching work order:', error);
      setError('Failed to load work order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold">Work Order Not Found</h2>
          <p className="text-gray-600 mt-2">{error || 'The requested work order could not be found.'}</p>
        </div>
        <Link href="/supervisor/work-orders" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Back to Work Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {workOrder.work_order_number || `Work Order #${workOrder.id}`}
            </h1>
            <p className="text-gray-600">{workOrder.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workOrder.status)}`}>
            {workOrder.status?.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(workOrder.priority)}`}>
            {workOrder.priority?.toUpperCase()} PRIORITY
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Work Order Number</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.work_order_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.work_order_type || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.asset_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.location || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {workOrder.due_date ? new Date(workOrder.due_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.description || 'No description provided.'}
            </p>
          </div>

          {/* Work Instructions */}
          {workOrder.work_instructions && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Instructions</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{workOrder.work_instructions}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.assigned_to_name || 'Unassigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Planner</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.planner_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.estimated_hours || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Actual Hours</label>
                <p className="mt-1 text-sm text-gray-900">{workOrder.actual_hours || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>{workOrder.completion_percentage || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${workOrder.completion_percentage || 0}%` }}
                  ></div>
                </div>
              </div>
              {workOrder.started_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Started</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(workOrder.started_at).toLocaleString()}
                  </p>
                </div>
              )}
              {workOrder.completed_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Completed</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(workOrder.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <Link 
                href={`/supervisor/work-orders/${workOrder.id}/edit`}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
              >
                Edit Work Order
              </Link>
              <Link 
                href={`/supervisor/assignments?work_order_id=${workOrder.id}`}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center block"
              >
                Manage Assignment
              </Link>
              <Link 
                href="/supervisor/work-orders"
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-center block"
              >
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}