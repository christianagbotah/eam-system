import api from '@/lib/api'
import { toast } from '@/lib/toast'

export const inventoryService = {
  async getAll(params?: { page?: number; per_page?: number; search?: string }) {
    try {
      const response = await api.get('/inventory/items', { params })
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to fetch inventory')
      throw error
    }
  },

  async getById(id: string | number) {
    try {
      const response = await api.get(`/inventory/${id}`)
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to fetch inventory item')
      throw error
    }
  },

  async create(data: any) {
    try {
      const response = await api.post('/inventory', data)
      toast.success('Inventory item created successfully')
      return response.data.data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create inventory item')
      throw error
    }
  },

  async update(id: string | number, data: any) {
    try {
      const response = await api.put(`/inventory/${id}`, data)
      toast.success('Inventory item updated successfully')
      return response.data.data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update inventory item')
      throw error
    }
  },

  async delete(id: string | number) {
    try {
      await api.delete(`/inventory/${id}`)
      toast.success('Inventory item deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete inventory item')
      throw error
    }
  },

  async stockIn(data: { item_id: number; quantity: number; reference?: string }) {
    try {
      const response = await api.post('/inventory/stock-in', data)
      return response.data
    } catch (error: any) {
      console.error('Stock in service error:', error)
      throw error
    }
  },

  async stockOut(data: { inventory_id: number; quantity: number; notes?: string }) {
    try {
      const response = await api.post('/inventory/stock-out', data)
      toast.success('Stock removed successfully')
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to remove stock')
      throw error
    }
  },

  async reserve(data: { inventory_id: number; quantity: number; work_order_id?: number }) {
    try {
      const response = await api.post('/inventory/reserve', data)
      toast.success('Stock reserved successfully')
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to reserve stock')
      throw error
    }
  },
}
