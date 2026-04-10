'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { tokenManager } from '@/lib/tokenManager'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  loading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        try {
          const userData = localStorage.getItem('user')
          const token = localStorage.getItem('access_token')
          
          if (token && userData) {
            setUser(JSON.parse(userData))
          }
        } catch (e) {
          console.error('Auth check failed:', e)
        }
      }
      setLoading(false)
    }
    
    checkAuth()
    
    // Re-check on storage change (for cross-tab sync and login)
    const handleStorageChange = () => {
      checkAuth()
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const refreshSession = async () => {
    try {
      const token = await tokenManager.getAccessToken();
      if (!token) {
        throw new Error('No valid token')
      }
    } catch (error) {
      console.error('Session refresh failed:', error)
      logout()
    }
  }

  const login = async (username: string, password: string): Promise<User> => {
    // Input validation
    if (!username || !password) {
      throw new Error('Please enter both username and password')
    }
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters')
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }
    
    try {
      const response = await api.post('/auth/login', { username, password })
      
      if (!response.data) {
        throw new Error('Unable to connect to server. Please try again.')
      }

      const data = response.data.data || response.data

      const userData = data.user
      const accessToken = data.token || data.tokens?.access_token || data.access_token
      const refreshToken = data.refresh_token || data.tokens?.refresh_token
      const expiresIn = data.expires_in || data.tokens?.expires_in || 3600
      
      // Normalize user data
      if (userData && !userData.full_name && userData.name) {
        userData.full_name = userData.name
      }

      if (!userData || !accessToken) {
        throw new Error('Invalid username or password. Please try again.')
      }

      // Use token manager for proper storage
      tokenManager.setTokens(accessToken, refreshToken, expiresIn)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Store permissions if available
      if (userData.permissions) {
        localStorage.setItem('user_permissions', JSON.stringify(userData.permissions))
      }
      
      setUser(userData)
      return userData
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password. Please check your credentials and try again.')
      }
      if (error.response?.status === 403) {
        throw new Error('Your account has been disabled. Please contact your administrator.')
      }
      if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please wait a few minutes and try again.')
      }
      if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later or contact support.')
      }
      if (!error.response) {
        throw new Error('Unable to connect to server. Please check your internet connection.')
      }
      // Re-throw if it's already a user-friendly message
      throw error
    }
  }

  const logout = () => {
    tokenManager.clearTokens()
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
