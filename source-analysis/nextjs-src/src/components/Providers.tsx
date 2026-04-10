'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/contexts/AuthContext'
import { AlertProvider } from '@/contexts/AlertContext'
import { AlertModalProvider } from '@/components/AlertModalProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'
import NavigationEvents from '@/components/NavigationEvents'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div id="top-loader" className="fixed top-0 left-0 h-1 bg-blue-600 transition-all duration-200 ease-out z-[9999]" style={{ width: '0%' }} />
      <NavigationEvents />
      <Toaster position="top-right" />
      <AlertModalProvider>
        <AlertProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </AlertProvider>
      </AlertModalProvider>
    </QueryClientProvider>
  )
}
