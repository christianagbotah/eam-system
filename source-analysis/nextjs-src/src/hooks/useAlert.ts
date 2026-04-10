import { useState } from 'react';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlert({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    alert,
    showAlert,
    closeAlert,
    showSuccess: (title: string, message: string) => showAlert(title, message, 'success'),
    showError: (title: string, message: string) => showAlert(title, message, 'error'),
    showWarning: (title: string, message: string) => showAlert(title, message, 'warning'),
    showInfo: (title: string, message: string) => showAlert(title, message, 'info'),
  };
}
