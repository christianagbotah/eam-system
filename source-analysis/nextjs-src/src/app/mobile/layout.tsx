'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { pushNotifications } from '@/lib/pushNotifications'
import { offlineStorage } from '@/lib/offlineStorage'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    
    if (user) {
      pushNotifications.requestPermission()
    }
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, loading, router])

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">EAM Mobile</h1>
            {!isOnline && <span className="text-xs bg-red-500 px-2 py-1 rounded">Offline</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">{user?.username}</span>
            <button onClick={() => router.push('/login')} className="text-xs bg-white/20 px-3 py-1 rounded">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-4 gap-1">
          <button onClick={() => router.push('/mobile')} className="p-3 text-center">
            <div className="text-2xl">🏠</div>
            <div className="text-xs">Home</div>
          </button>
          <button onClick={() => router.push('/mobile/scan')} className="p-3 text-center">
            <div className="text-2xl">📷</div>
            <div className="text-xs">Scan</div>
          </button>
          <button onClick={() => router.push('/mobile/work-orders')} className="p-3 text-center">
            <div className="text-2xl">🔧</div>
            <div className="text-xs">Work Orders</div>
          </button>
          <button onClick={() => router.push('/mobile/alerts')} className="p-3 text-center">
            <div className="text-2xl">🔔</div>
            <div className="text-xs">Alerts</div>
          </button>
        </div>
      </nav>
    </div>
  )
}
