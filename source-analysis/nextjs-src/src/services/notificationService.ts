import api from '@/lib/api';
import axios from 'axios';

// Create a separate axios instance for notifications that won't trigger redirects
const notificationApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1/eam',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth header but don't redirect on failure
notificationApi.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Silently handle errors without redirecting
notificationApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Just reject without redirecting
    return Promise.reject(error);
  }
);

export const notificationService = {
  getNotifications: () => notificationApi.get('/notifications'),
  getUserNotifications: (userId: number) => notificationApi.get(`/notifications/user/${userId}`),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  create: (data: any) => api.post('/notifications', data),
  send: (data: any) => api.post('/notifications/send', data),
};
