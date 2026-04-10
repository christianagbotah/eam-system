import api from '@/lib/api'

export const erpService = {
  async getSyncStatus() {
    const response = await api.get('/erp/sync-status')
    return response.data
  },

  async syncAssets() {
    const response = await api.post('/erp/sync/assets')
    return response.data
  },

  async syncWorkOrders() {
    const response = await api.post('/erp/sync/work-orders')
    return response.data
  },

  async syncInventory() {
    const response = await api.post('/erp/sync/inventory')
    return response.data
  },

  async getSyncHistory(limit: number = 50) {
    const response = await api.get('/erp/sync-history', {
      params: { limit }
    })
    return response.data
  },

  async retryFailedSync(syncId: string) {
    const response = await api.post(`/erp/sync/${syncId}/retry`)
    return response.data
  }
}
