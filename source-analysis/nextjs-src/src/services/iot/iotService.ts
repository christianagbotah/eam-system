import api from '@/lib/api'

export const iotService = {
  async getDevices() {
    const response = await api.get('/iot/devices')
    return response.data
  },

  async getDeviceMetrics(deviceId: string, timeRange: string = '24h') {
    const response = await api.get(`/iot/devices/${deviceId}/metrics`, {
      params: { range: timeRange }
    })
    return response.data
  },

  async getAssetMetrics(assetId: string, timeRange: string = '24h') {
    const response = await api.get(`/iot/assets/${assetId}/metrics`, {
      params: { range: timeRange }
    })
    return response.data
  },

  async getAlerts(assetId?: string) {
    const response = await api.get('/iot/alerts', {
      params: assetId ? { asset_id: assetId } : {}
    })
    return response.data
  },

  async acknowledgeAlert(alertId: string) {
    const response = await api.post(`/iot/alerts/${alertId}/acknowledge`)
    return response.data
  }
}
