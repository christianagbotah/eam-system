import api from '@/lib/api';

export const executiveService = {
  async getDashboard() {
    const response = await api.get('/executive-dashboard');
    return response.data.data;
  },

  async getTrends(days: number = 30) {
    const response = await api.get('/executive-dashboard/trends', { params: { days } });
    return response.data.data;
  },

  async getAlerts() {
    const response = await api.get('/executive-dashboard/alerts');
    return response.data.data;
  },
};
