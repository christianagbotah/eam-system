'use client';

import { useState } from 'react';
import { PMCalendarEvent } from '@/hooks/usePMSchedules';
import { toast } from 'react-hot-toast';

interface PMScheduleDetailPanelProps {
  event: PMCalendarEvent;
  onClose: () => void;
  onGenerateWorkOrder: (scheduleId: number) => Promise<void>;
  onRefresh: () => void;
}

export default function PMScheduleDetailPanel({ 
  event, 
  onClose, 
  onGenerateWorkOrder, 
  onRefresh 
}: PMScheduleDetailPanelProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateWorkOrder = async () => {
    try {
      setGenerating(true);
      await onGenerateWorkOrder(event.pm_schedule_id);
      onRefresh();
    } catch (error) {
      toast.error('Failed to generate work order');
    } finally {
      setGenerating(false);
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

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Schedule Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Event Info */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">{event.title}</h3>
          <p className="text-sm text-gray-600 mt-1">PM Schedule #{event.pm_schedule_id}</p>
        </div>

        {/* Status and Priority */}
        <div className="flex space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.status)}`}>
            {event.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(event.priority)}`}>
            {event.priority}
          </span>
        </div>

        {/* Schedule Details */}
        <div className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Scheduled Date</dt>
            <dd className="text-sm text-gray-900">
              {event.start.toLocaleDateString()} at {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Maintenance Type</dt>
            <dd className="text-sm text-gray-900 capitalize">{event.maintenance_type}</dd>
          </div>

          {event.asset_id && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Asset</dt>
              <dd className="text-sm text-gray-900">Asset #{event.asset_id}</dd>
            </div>
          )}

          {event.assigned_to && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
              <dd className="text-sm text-gray-900">{event.assigned_to}</dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">Duration</dt>
            <dd className="text-sm text-gray-900">
              {Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60))} hours
            </dd>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t space-y-3">
          {event.status === 'waiting' && (
            <button
              onClick={handleGenerateWorkOrder}
              disabled={generating}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </div>
              ) : (
                'Generate Work Order'
              )}
            </button>
          )}

          <button
            onClick={() => {
              // Navigate to schedule detail page
              window.open(`/pm/schedules/${event.pm_schedule_id}`, '_blank');
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            View Full Details
          </button>

          <button
            onClick={() => {
              // Navigate to template
              // Note: We'd need the template ID from the event data
              toast.info('Template view not implemented');
            }}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            View Template
          </button>
        </div>

        {/* Quick Stats */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Info</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium">Priority</div>
              <div className="capitalize">{event.priority}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium">Type</div>
              <div className="capitalize">{event.maintenance_type}</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h4>
          <div className="text-xs text-gray-600">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Schedule created</span>
            </div>
            {event.status !== 'waiting' && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Status updated to {event.status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
