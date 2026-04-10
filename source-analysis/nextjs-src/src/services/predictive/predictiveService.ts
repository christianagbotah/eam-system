import api from '@/lib/api'

export const predictiveService = {
  async getAssetPrediction(assetId: string) {
    const response = await api.get(`/predictive/assets/${assetId}`)
    return response.data
  },

  async getAssetsAtRisk() {
    const response = await api.get('/predictive/at-risk')
    return response.data
  },

  async getAnomalies() {
    const response = await api.get('/predictive/anomalies')
    return response.data
  },

  async getModelMetrics() {
    const response = await api.get('/predictive/model-metrics')
    return response.data
  },

  async createPredictiveWorkOrder(assetId: string, prediction: any) {
    const response = await api.post('/work-orders', {
      asset_id: assetId,
      work_type: 'preventive',
      priority: prediction.risk_level === 'critical' ? 'high' : 'medium',
      description: `Predictive maintenance: ${prediction.recommended_action}`,
      scheduled_start: new Date().toISOString(),
      scheduled_end: prediction.predicted_failure_date
    })
    return response.data
  }
}
