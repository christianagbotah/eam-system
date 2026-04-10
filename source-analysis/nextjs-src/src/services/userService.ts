import api from '@/lib/api'
import { showToast } from '@/lib/toast'

export const userService = {
  async getUsers() {
    try {
      const response = await api.get('/users')
      return response.data
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      return { data: [] }
    }
  },

  async getAll(params?: { page?: number; per_page?: number; search?: string }) {
    try {
      const response = await api.get('/users', { params })
      return response.data.data
    } catch (error: any) {
      showToast.error('Failed to fetch users')
      throw error
    }
  },

  async getById(id: string | number) {
    try {
      const response = await api.get(`/users/${id}`)
      return response.data.data
    } catch (error: any) {
      showToast.error('Failed to fetch user')
      throw error
    }
  },

  async create(data: any) {
    try {
      const response = await api.post('/users', data)
      showToast.success('User created successfully')
      return response.data.data
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to create user')
      throw error
    }
  },

  async update(id: string | number, data: any) {
    try {
      const response = await api.put(`/users/${id}`, data)
      showToast.success('User updated successfully')
      return response.data.data
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to update user')
      throw error
    }
  },

  async delete(id: string | number) {
    try {
      await api.delete(`/users/${id}`)
      showToast.success('User deleted successfully')
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to delete user')
      throw error
    }
  },

  async assignRole(userId: number, roleId: number) {
    try {
      const response = await api.post(`/users/${userId}/assign-role`, { role_id: roleId })
      showToast.success('Role assigned successfully')
      return response.data.data
    } catch (error: any) {
      showToast.error('Failed to assign role')
      throw error
    }
  },
}
