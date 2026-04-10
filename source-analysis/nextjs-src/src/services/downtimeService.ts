import api from '@/lib/api';

export const downtimeService = {
  getDowntimeLogs: async (params?: any) => {
    const { data } = await api.get('/downtime', { params });
    return data;
  },

  logDowntime: async (downtimeData: any) => {
    const { data } = await api.post('/downtime', downtimeData);
    return data;
  },

  updateDowntime: async (id: number, downtimeData: any) => {
    const { data } = await api.put(`/downtime/${id}`, downtimeData);
    return data;
  },

  deleteDowntime: async (id: number) => {
    const { data } = await api.delete(`/downtime/${id}`);
    return data;
  },

  getPareto: async (params?: any) => {
    const { data } = await api.get('/downtime/pareto', { params });
    return data;
  }
};
