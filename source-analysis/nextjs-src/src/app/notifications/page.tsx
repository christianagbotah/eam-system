'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { FiBell, FiCheckCircle, FiAlertTriangle, FiInfo, FiX, FiSettings, FiRefreshCw } from 'react-icons/fi';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  read: boolean;
  created_at: string;
  time?: string;
}

export default function NotificationsPage() {
  const { hasPermission } = usePermissions();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const canMarkRead = hasPermission('notifications.mark_read');
  const canDelete = hasPermission('notifications.delete');
  const canManageSettings = hasPermission('notifications.settings');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    if (!canMarkRead) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!canMarkRead) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!canDelete) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost/factorymanager/public/index.php/api/v1/eam/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setNotifications(notifications.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <FiAlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <FiAlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'success': return <FiCheckCircle className="w-4 h-4 text-green-600" />;
      default: return <FiInfo className="w-4 h-4 text-blue-600" />;
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'high') return n.priority === 'high';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FiBell className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
              <p className="text-gray-600">{unreadCount} unread messages</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchNotifications} className="p-2 hover:bg-gray-100 rounded-lg">
              <FiRefreshCw className="w-5 h-5" />
            </button>
            {canMarkRead && (
              <button onClick={markAllAsRead} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Mark All Read
              </button>
            )}
            {canManageSettings && (
              <button className="p-2 border rounded-lg hover:bg-gray-50">
                <FiSettings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              High Priority
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FiBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            filtered.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm p-4 ${
                  !notification.read ? 'border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${
                            !notification.read ? 'text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {notification.time || new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && canMarkRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Mark as read"
                          >
                            <FiCheckCircle className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <FiX className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings Info */}
        {canManageSettings && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FiSettings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">Notification Preferences</div>
                <div className="text-sm text-blue-700 mt-1">
                  Configure alert rules, email notifications, and SMS settings in the settings panel.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
