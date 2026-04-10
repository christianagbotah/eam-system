import api from '@/lib/api';

export const workCenterService = {
  getWorkCenters: async () => {
    const { data } = await api.get('/work-centers');
    return data;
  },

  getWorkCenter: async (id: number) => {
    const { data } = await api.get(`/work-centers/${id}`);
    return data;
  },

  createWorkCenter: async (centerData: any) => {
    const { data } = await api.post('/work-centers', centerData);
    return data;
  },

  updateWorkCenter: async (id: number, centerData: any) => {
    const { data } = await api.put(`/work-centers/${id}`, centerData);
    return data;
  },

  deleteWorkCenter: async (id: number) => {
    const { data } = await api.delete(`/work-centers/${id}`);
    return data;
  }
};
