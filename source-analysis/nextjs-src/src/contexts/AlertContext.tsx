'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AlertModal from '@/components/AlertModal';

interface AlertContextType {
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      showAlert(event.detail.title, event.detail.message, 'error');
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('showApiError', handleApiError as EventListener);
      return () => window.removeEventListener('showApiError', handleApiError as EventListener);
    }
  }, []);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const closeAlertImmediate = () => {
    setAlert({ isOpen: false, title: '', message: '', type: 'info' });
  };

  return (
    <AlertContext.Provider
      value={{
        showSuccess: (title, message) => showAlert(title, message, 'success'),
        showError: (title, message) => showAlert(title, message, 'error'),
        showWarning: (title, message) => showAlert(title, message, 'warning'),
        showInfo: (title, message) => showAlert(title, message, 'info'),
        closeAlert: closeAlertImmediate,
      }}
    >
      {children}
      <AlertModal {...alert} onClose={closeAlert} />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}
