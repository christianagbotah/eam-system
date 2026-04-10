'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface TimelineEvent {
  id: number;
  action: string;
  old_status?: string;
  new_status?: string;
  notes?: string;
  created_at: string;
  username?: string;
}

interface WorkOrderTimelineProps {
  workOrderId: string;
}

export default function WorkOrderTimeline({ workOrderId }: WorkOrderTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [workOrderId]);

  const fetchTimeline = async () => {
    try {
      const response = await api.get(`/work-orders/${workOrderId}/history`);
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  const getActionIcon = (action: string) => {
    const icons = {
      created: '🆕',
      assigned: '👤',
      started: '▶️',
      paused: '⏸️',
      completed: '✅',
      cancelled: '❌',
      status_changed: '🔄'
    };
    return icons[action as keyof typeof icons] || '📝';
  };

  const formatAction = (event: TimelineEvent) => {
    if (event.old_status && event.new_status) {
      return `Status changed from ${event.old_status} to ${event.new_status}`;
    }
    return event.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
      
      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No activity yet</p>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {events.map((event, eventIdx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== events.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
                      {getActionIcon(event.action)}
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-900">
                          {formatAction(event)}
                          {event.username && (
                            <span className="text-gray-500"> by {event.username}</span>
                          )}
                        </p>
                        {event.notes && (
                          <p className="mt-1 text-sm text-gray-600">{event.notes}</p>
                        )}
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
