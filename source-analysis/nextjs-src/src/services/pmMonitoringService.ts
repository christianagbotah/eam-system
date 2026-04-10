import api from '@/lib/api';

export const pmMonitoringService = {
  getTasks: async (status?: string) => {
    const params = status ? { status } : {};
    const { data } = await api.get('/pm-monitoring', { params });
    return data;
  },

  getStatistics: async () => {
    const { data } = await api.get('/pm-monitoring/statistics');
    return data;
  },

  generateWorkOrder: async (taskId: number) => {
    const { data } = await api.post(`/pm-monitoring/${taskId}/generate-wo`);
    return data;
  }
};
