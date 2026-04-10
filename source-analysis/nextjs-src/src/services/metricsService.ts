import api from '@/lib/api';

export const metricsService = {
  getDashboardMetrics: async () => {
    const { data } = await api.get('/metrics/dashboard');
    return data;
  },

  getAssetMetrics: async (assetId: number) => {
    const { data } = await api.get(`/metrics/asset/${assetId}`);
    return data;
  }
};
