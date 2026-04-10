import api from '@/lib/api'

export const analyticsService = {
  async getKPIs(timeRange: string = '30d') {
    const response = await api.get('/analytics/kpis', {
      params: { range: timeRange }
    })
    return response.data
  },

  async getAssetKPIs(assetId: string) {
    const response = await api.get(`/analytics/assets/${assetId}/kpis`)
    return response.data
  },

  async getDepartmentMetrics() {
    const response = await api.get('/analytics/departments')
    return response.data
  },

  async getMaintenanceCosts(startDate: string, endDate: string) {
    const response = await api.get('/analytics/maintenance-costs', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  },

  async getDowntimeAnalysis(assetId?: string) {
    const response = await api.get('/analytics/downtime', {
      params: assetId ? { asset_id: assetId } : {}
    })
    return response.data
  },

  async getQuickSightEmbedUrl(dashboardId: string) {
    const response = await api.get('/analytics/quicksight-url', {
      params: { dashboard: dashboardId }
    })
    return response.data
  },

  async getPredictiveInsights(assetId: string) {
    const response = await api.get(`/analytics/predictive/${assetId}`)
    return response.data
  }
}
