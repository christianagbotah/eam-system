'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PlannerLayout from '@/components/layouts/PlannerLayout'
import PermissionGuard from '@/components/guards/PermissionGuard'

export default function PlannerLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <PermissionGuard requiredPermissions={['pm_schedules.view', 'work_orders.create', 'production.plan']}>
      <PlannerLayout>{children}</PlannerLayout>
    </PermissionGuard>
  )
}
