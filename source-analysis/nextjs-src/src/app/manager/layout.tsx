'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'

const managerMenuItems = [
  { label: 'Dashboard', href: '/manager/dashboard', icon: '📊' },
  { label: 'Users', href: '/manager/users', icon: '👥' },
  { label: 'Departments', href: '/manager/departments', icon: '🏢' },
  { label: 'Assets', href: '/manager/assets', icon: '⚙️' },
  { label: 'Work Orders', href: '/manager/work-orders', icon: '📋' },
  { label: 'Reports', href: '/manager/reports', icon: '📊' },
  { label: 'Settings', href: '/manager/settings', icon: '⚙️' },
]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
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

  return <DashboardLayout role="manager">{children}</DashboardLayout>
}