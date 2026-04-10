'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import PlannerLayout from '@/components/layouts/PlannerLayout'
import { checkAuth } from '@/middleware/auth'

export default function MachineLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const auth = checkAuth()
    if (!auth) {
      router.replace('/login')
      return
    }
    setIsAuthenticated(true)
    setUserRole(auth.user?.role || '')
  }, [router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Use PlannerLayout if user is planner, otherwise use DashboardLayout
  if (userRole === 'planner') {
    return <PlannerLayout>{children}</PlannerLayout>
  }

  return <DashboardLayout role="admin">{children}</DashboardLayout>
}
