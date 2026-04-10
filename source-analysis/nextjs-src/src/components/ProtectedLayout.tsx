'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedLayoutProps {
  children: React.ReactNode
  allowedRoles: string[]
  redirectTo?: string
}

export default function ProtectedLayout({ 
  children, 
  allowedRoles, 
  redirectTo = '/login' 
}: ProtectedLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      if (loading) {
        setIsChecking(true)
        return
      }

      // Double-check localStorage before redirecting
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('access_token')

      if (!user && (!storedUser || !storedToken)) {
        // No user in context and no stored data - redirect
        router.replace(redirectTo)
        return
      }

      if (!user && storedUser && storedToken) {
        // User exists in storage but not in context - wait a bit
        setTimeout(() => {
          if (!user) {
            router.replace(redirectTo)
          }
        }, 300)
        return
      }

      if (user && !allowedRoles.includes(user.role)) {
        // User logged in but wrong role
        router.replace(redirectTo)
        return
      }

      // All checks passed
      setIsAuthorized(true)
      setIsChecking(false)
    }

    checkAuth()
  }, [user, loading, allowedRoles, redirectTo, router])

  if (loading || isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading...' : 'Authenticating...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
