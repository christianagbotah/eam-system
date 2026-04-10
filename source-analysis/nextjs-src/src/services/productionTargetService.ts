import api from '@/lib/api';

export const productionTargetService = {
  getTargets: async () => {
    const { data } = await api.get('/production-targets');
    return data;
  },

  getTarget: async (id: number) => {
    const { data } = await api.get(`/production-targets/${id}`);
    return data;
  },

  createTarget: async (targetData: any) => {
    const { data } = await api.post('/production-targets', targetData);
    return data;
  },

  updateTarget: async (id: number, targetData: any) => {
    const { data } = await api.put(`/production-targets/${id}`, targetData);
    return data;
  },

  deleteTarget: async (id: number) => {
    const { data } = await api.delete(`/production-targets/${id}`);
    return data;
  },

  getDashboard: async () => {
    const { data } = await api.get('/production/dashboard');
    return data;
  }
};
