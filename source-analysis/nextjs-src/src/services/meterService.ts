import api from '@/lib/api';

export const meterService = {
  getMeters: async () => {
    const { data } = await api.get('/meters');
    return data;
  },

  getMeter: async (id: number) => {
    const { data } = await api.get(`/meters/${id}`);
    return data;
  },

  createMeter: async (meterData: any) => {
    const { data } = await api.post('/meters', meterData);
    return data;
  },

  updateMeter: async (id: number, meterData: any) => {
    const { data } = await api.put(`/meters/${id}`, meterData);
    return data;
  },

  deleteMeter: async (id: number) => {
    const { data } = await api.delete(`/meters/${id}`);
    return data;
  },

  recordReading: async (id: number, readingData: any) => {
    const { data } = await api.post(`/meters/${id}/readings`, readingData);
    return data;
  }
};
