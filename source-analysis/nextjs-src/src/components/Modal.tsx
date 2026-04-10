'use client'

import { useEffect, useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      setTimeout(() => setShouldRender(false), 200)
    }
  }, [isOpen])

  if (!shouldRender) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
      isVisible ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
    }`}>
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 transition-all duration-200 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
