import api from '@/lib/api'
import { toast } from '@/lib/toast'

export const roleService = {
  async getAll(params?: { page?: number; per_page?: number }) {
    try {
      const response = await api.get('/roles', { params })
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to fetch roles')
      throw error
    }
  },

  async getById(id: string | number) {
    try {
      const response = await api.get(`/roles/${id}`)
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to fetch role')
      throw error
    }
  },

  async create(data: any) {
    try {
      const response = await api.post('/roles', data)
      toast.success('Role created successfully')
      return response.data.data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create role')
      throw error
    }
  },

  async update(id: string | number, data: any) {
    try {
      const response = await api.put(`/roles/${id}`, data)
      toast.success('Role updated successfully')
      return response.data.data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update role')
      throw error
    }
  },

  async delete(id: string | number) {
    try {
      await api.delete(`/roles/${id}`)
      toast.success('Role deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role')
      throw error
    }
  },

  async assignPermissions(roleId: number, permissions: string[]) {
    try {
      const response = await api.post(`/roles/${roleId}/assign-permissions`, { permissions })
      toast.success('Permissions assigned successfully')
      return response.data.data
    } catch (error: any) {
      toast.error('Failed to assign permissions')
      throw error
    }
  },
}
