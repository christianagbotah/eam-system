'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { checkAuth } from '@/middleware/auth'

export default function ShopAttendantLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const auth = checkAuth()
    console.log('Shop Attendant Auth Check:', auth)
    
    if (!auth) {
      console.log('No auth found, redirecting to login')
      router.replace('/login')
      return
    }
    
    // Check if user role is shop-attendant or admin
    const userRole = auth.user?.role || ''
    console.log('User role:', userRole)
    
    if (userRole !== 'shop_attendant' && userRole !== 'shop-attendant' && userRole !== 'admin') {
      console.log('Unauthorized role:', userRole)
      router.replace('/unauthorized')
      return
    }
    
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <DashboardLayout role="shop_attendant">{children}</DashboardLayout>
}
