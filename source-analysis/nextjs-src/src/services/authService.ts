import api from '@/lib/api'
import { toast } from '@/lib/toast'

export const authService = {
  async login(username: string, password: string) {
    try {
      const response = await api.post('/auth/login', { username, password })
      const data = response.data
      
      // Backend returns: { token, refresh_token, user, expires_in }
      const token = data.token || data.access_token
      const refreshToken = data.refresh_token
      const user = data.user
      
      localStorage.setItem('access_token', token)
      localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      
      // Set cookie for middleware
      document.cookie = `access_token=${token}; path=/; max-age=${data.expires_in || 86400}; SameSite=Strict`
      
      toast.success('Login successful!')
      return user
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed')
      throw error
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      document.cookie = 'access_token=; path=/; max-age=0'
      toast.success('Logged out successfully')
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      document.cookie = 'access_token=; path=/; max-age=0'
    }
  },

  async refresh(refreshToken: string) {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
    return response.data.data.tokens
  },
}
