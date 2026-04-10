import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
});

export const listTemplates = (params = {}) => api.get('/pm/templates', { params });
export const getTemplate = (id: number) => api.get(`/pm/templates/${id}`);
export const createTemplate = (payload: any) => api.post('/pm/templates', payload);
export const updateTemplate = (id: number, payload: any) => api.put(`/pm/templates/${id}`, payload);
export const runScheduler = (payload: any) => api.post('/pm/run', payload);
export const listSchedules = (params = {}) => api.get('/pm/schedules', { params });

export default api;
