import api from '@/lib/api';

export const reportService = {
  getPMHistory: async (params?: any) => {
    const { data } = await api.get('/reports/pm-history', { params });
    return data;
  },

  getWorkOrderHistory: async (params?: any) => {
    const { data } = await api.get('/reports/wo-history', { params });
    return data;
  },

  getInventoryMovements: async (params?: any) => {
    const { data } = await api.get('/reports/inventory-movements', { params });
    return data;
  },

  getAssetUtilization: async (params?: any) => {
    const { data } = await api.get('/reports/asset-utilization', { params });
    return data;
  },

  getMaintenanceCosts: async (params?: any) => {
    const { data } = await api.get('/reports/maintenance-costs', { params });
    return data;
  }
};
