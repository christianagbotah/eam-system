'use client'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

export default function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  useEffect(() => {
    const unsubscribe = toast.subscribe((type, message) => {
      const id = Date.now()
      setMessages(prev => [...prev, { id, type, message }])
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== id))
      }, 3000)
    })
    return unsubscribe
  }, [])

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map(msg => (
        <div key={msg.id} className={`${colors[msg.type]} text-white px-6 py-3 rounded-lg shadow-lg animate-slideIn`}>
          {msg.message}
        </div>
      ))}
    </div>
  )
}
