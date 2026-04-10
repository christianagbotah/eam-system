'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pmService, PMSchedule } from '@/services/pmService';
import { toast } from 'react-hot-toast';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PMScheduleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [schedule, setSchedule] = useState<PMSchedule | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadScheduleDetails();
    }
  }, [params.id]);

  const loadScheduleDetails = async () => {
    try {
      setLoading(true);
      // Note: We need to implement getSchedule method in pmService
      // For now, we'll get it from the list
      const schedulesResponse = await pmService.listSchedules();
      if (schedulesResponse.success) {
        const foundSchedule = schedulesResponse.data.find((s: PMSchedule) => s.id === Number(params.id));
        if (foundSchedule) {
          setSchedule(foundSchedule);
          
          // Load history
          const historyResponse = await pmService.getScheduleHistory(Number(params.id));
          if (historyResponse.success) {
            setHistory(historyResponse.data);
          }
        } else {
          toast.error('Schedule not found');
          router.push('/pm/schedules');
        }
      }
    } catch (error) {
      toast.error('Failed to load schedule details');
      router.push('/pm/schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkOrder = async () => {
    if (!schedule) return;
    
    try {
      setGenerating(true);
      const response = await pmService.generateWorkOrder(schedule.id);
      if (response.success) {
        toast.success(`Work order ${(response.data as any)?.work_order_number} generated successfully`);
        loadScheduleDetails(); // Refresh data
      } else {
        toast.error(response.error || 'Failed to generate work order');
      }
    } catch (error) {
      toast.error('Failed to generate work order');
    } finally {
      setGenerating(false);
    }
  };

  const handleReschedule = async () => {
    if (!schedule) return;
    
    const newDate = prompt('Enter new due date (YYYY-MM-DD):', schedule.next_due_date || '');
    if (!newDate) return;
    
    try {
      const response = await pmService.updateSchedule(schedule.id, {
        next_due_date: newDate,
        comment: 'Manually rescheduled'
      });
      if (response.success) {
        toast.success('Schedule updated successfully');
        loadScheduleDetails();
      } else {
        toast.error(response.error || 'Failed to update schedule');
      }
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-blue-100 text-blue-800';
      case 'generated': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Schedule Not Found</h1>
          <p className="text-gray-600 mt-2">The requested PM schedule could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{schedule.title}</h1>
          <p className="text-gray-600">{schedule.description}</p>
        </div>
        <div className="space-x-2">
          {schedule.status === 'waiting' && (
            <>
              <button
                onClick={handleGenerateWorkOrder}
                disabled={generating}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Work Order'}
              </button>
              <button
                onClick={handleReschedule}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Reschedule
              </button>
            </>
          )}
          <button
            onClick={() => router.push('/pm/schedules')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Schedules
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Schedule Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">PM Template ID</dt>
                <dd className="text-sm text-gray-900">{schedule.pm_template_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(schedule.status)}`}>
                    {schedule.status.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="text-sm">
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(schedule.priority)}`}>
                    {schedule.priority}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Maintenance Type</dt>
                <dd className="text-sm text-gray-900 capitalize">{schedule.maintenance_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Next Due Date</dt>
                <dd className="text-sm text-gray-900">
                  {schedule.next_due_date ? 
                    formatDate(schedule.next_due_date) : 
                    'Not set'
                  }
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Next Due Usage</dt>
                <dd className="text-sm text-gray-900">
                  {schedule.next_due_usage ? 
                    `${schedule.next_due_usage.toLocaleString()} units` : 
                    'Not set'
                  }
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {schedule.status === 'waiting' && (
                <button
                  onClick={handleGenerateWorkOrder}
                  disabled={generating}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Work Order'}
                </button>
              )}
              <button
                onClick={handleReschedule}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Reschedule
              </button>
              <button
                onClick={() => router.push(`/pm/templates/${schedule.pm_template_id}`)}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                View Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Schedule History</h2>
          </div>
          <div className="p-6">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No history available</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {entry.action.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(entry.performed_at)}
                        </div>
                      </div>
                      {entry.comment && (
                        <div className="text-sm text-gray-600 mt-1">{entry.comment}</div>
                      )}
                      {entry.performed_by_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          by {entry.performed_by_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}