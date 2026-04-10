import api from '@/lib/api';

export const resourcePlanningService = {
  getUtilization: async (params?: any) => {
    const { data } = await api.get('/resource-availability/utilization', { params });
    return data;
  },

  getAvailability: async (params?: any) => {
    const { data } = await api.get('/resource-availability', { params });
    return data;
  }
};
