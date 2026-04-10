'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PmNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const url = '/api/v1/eam/pm-notifications?role=admin';
      const response = await fetch(url);
      const data = response.data;
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to load notifications');
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/pm-notifications/${id}/read`, formData);
      fetchNotifications();
    } catch (error) {
      showToast.error('Failed to mark as read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'due_soon': return '⏰';
      case 'overdue': return '🚨';
      case 'assigned': return '👤';
      case 'completed': return '✅';
      default: return '📋';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'overdue': return 'bg-red-50 border-red-200';
      case 'due_soon': return 'bg-yellow-50 border-yellow-200';
      case 'assigned': return 'bg-blue-50 border-blue-200';
      case 'completed': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">PM Notifications</h1>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div
              key={notif.id}
              className={`rounded-lg border p-4 ${getColor(notif.notification_type)} ${
                notif.is_read ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{getIcon(notif.notification_type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{notif.title}</h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDateTime(notif.created_at)}
                    </p>
                  </div>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
