import api from '@/lib/api';

export const productionService = {
  getProductionRuns: async () => {
    const { data } = await api.get('/production-runs');
    return data;
  },

  getProductionRun: async (id: number) => {
    const { data } = await api.get(`/production-runs/${id}`);
    return data;
  },

  createProductionRun: async (runData: any) => {
    const { data } = await api.post('/production-runs', runData);
    return data;
  },

  createSurvey: async (runId: number, surveyData: any) => {
    const { data } = await api.post(`/production-runs/${runId}/surveys`, surveyData);
    return data;
  },

  getSurveys: async (runId: number) => {
    const { data} = await api.get(`/production-runs/${runId}/surveys`);
    return data;
  }
};
