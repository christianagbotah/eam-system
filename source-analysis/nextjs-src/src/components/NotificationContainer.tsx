'use client'
import { useEffect, useState } from 'react'
import { toast, Notification } from '@/lib/toast'

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const unsubscribe = toast.subscribe(setNotifications)
    return unsubscribe
  }, [])

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-500 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-500 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-500 text-blue-800'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      default: return 'ℹ️'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getStyles(notification.type)} border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in`}
        >
          <span className="text-2xl">{getIcon(notification.type)}</span>
          <div className="flex-1">
            <p className="font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => toast.remove(notification.id)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
