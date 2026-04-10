import api from '@/lib/api';

export const meterReadingService = {
  getReadings: async (params?: any) => {
    const { data } = await api.get('/meter-readings', { params });
    return data;
  },

  recordReading: async (readingData: any) => {
    const { data } = await api.post('/meter-readings', readingData);
    return data;
  },

  deleteReading: async (id: number) => {
    const { data } = await api.delete(`/meter-readings/${id}`);
    return data;
  }
};
