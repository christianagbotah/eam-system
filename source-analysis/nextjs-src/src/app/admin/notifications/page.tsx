'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, X, Settings, RefreshCw } from 'lucide-react';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';

function NotificationsContent() {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.status === 'success') {
        setNotifications(res.data.data || []);
      }
    } catch (error) {
      showToast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.data?.status === 'success') {
        setNotifications(notifications.map((n: any) => n.id === id ? { ...n, read: true } : n));
        showToast.success('Marked as read');
      }
    } catch (error) {
      showToast.error('Failed to update');
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await api.post('/notifications/mark-all-read');
      if (res.data?.status === 'success') {
        setNotifications(notifications.map((n: any) => ({ ...n, read: true })));
        showToast.success('All marked as read');
      }
    } catch (error) {
      showToast.error('Failed to update');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter((n: any) => n.id !== id));
      showToast.success('Notification deleted');
    } catch (error) {
      showToast.error('Failed to delete');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const filtered = notifications.filter((n: any) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'high') return n.priority === 'high';
    return true;
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  if (loading) return <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-4xl mx-auto"><TableSkeleton rows={6} /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-base font-semibold">Notifications</h1>
              <p className="text-gray-600">{unreadCount} unread messages</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchNotifications} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={markAllAsRead} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Mark All Read</button>
            <button className="p-2 border rounded-lg hover:bg-gray-50"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>All ({notifications.length})</button>
            <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Unread ({unreadCount})</button>
            <button onClick={() => setFilter('high')} className={`px-4 py-2 rounded-lg text-sm ${filter === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>High Priority</button>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
          filtered.map((notification: any) => (
            <div key={notification.id} className={`bg-white rounded-lg shadow-sm p-4 ${!notification.read ? 'border-l-4 border-blue-600' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>{notification.title}</h3>
                      <p className="text-sm text-xs text-gray-600 mt-0.5">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{notification.time || new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <button onClick={() => markAsRead(notification.id)} className="p-1 hover:bg-gray-100 rounded" title="Mark as read">
                          <CheckCircle className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(notification.id)} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Settings className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">Notification Preferences</div>
              <div className="text-sm text-blue-700 mt-1">Configure alert rules, email notifications, and SMS settings in the settings panel.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RBACGuard module="notifications" action="view">
      <NotificationsContent />
    </RBACGuard>
  );
}
