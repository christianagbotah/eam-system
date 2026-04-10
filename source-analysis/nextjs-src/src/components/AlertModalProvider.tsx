'use client';

import { useState, useEffect, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

let alertFn: (config: Omit<AlertState, 'isOpen'>) => void = () => {};

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (config: Omit<AlertState, 'isOpen'>) => {
    setAlert({ ...config, isOpen: true });
    
    // Auto-close success modals after 2.5 seconds
    if (config.type === 'success') {
      setTimeout(() => {
        setAlert(prev => ({ ...prev, isOpen: false }));
      }, 2500);
    }
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  alertFn = showAlert;

  const handleConfirm = () => {
    alert.onConfirm?.();
    hideAlert();
  };

  const handleCancel = () => {
    alert.onCancel?.();
    hideAlert();
  };

  const getIcon = () => {
    const iconClass = "h-12 w-12";
    switch (alert.type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} strokeWidth={1.5} />;
      case 'error':
        return <XCircle className={`${iconClass} text-red-500`} strokeWidth={1.5} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-amber-500`} strokeWidth={1.5} />;
      case 'confirm':
        return <AlertTriangle className={`${iconClass} text-orange-500`} strokeWidth={1.5} />;
      default:
        return <Info className={`${iconClass} text-blue-500`} strokeWidth={1.5} />;
    }
  };

  const getColors = () => {
    switch (alert.type) {
      case 'success':
        return { bg: 'bg-green-50', border: 'border-green-200', button: 'bg-green-600 hover:bg-green-700' };
      case 'error':
        return { bg: 'bg-red-50', border: 'border-red-200', button: 'bg-red-600 hover:bg-red-700' };
      case 'warning':
        return { bg: 'bg-amber-50', border: 'border-amber-200', button: 'bg-amber-600 hover:bg-amber-700' };
      case 'confirm':
        return { bg: 'bg-orange-50', border: 'border-orange-200', button: 'bg-orange-600 hover:bg-orange-700' };
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', button: 'bg-blue-600 hover:bg-blue-700' };
    }
  };

  const colors = getColors();

  return (
    <>
      {children}
      {alert.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={hideAlert} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-scale-in">
            <div className={`${colors.bg} ${colors.border} border-b px-6 py-8`}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {getIcon()}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {alert.title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-5 bg-gray-50">
              {alert.type === 'confirm' ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-5 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-5 py-3 text-sm font-semibold text-white ${colors.button} rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl`}
                  >
                    Confirm
                  </button>
                </div>
              ) : (
                <button
                  onClick={hideAlert}
                  className={`w-full px-5 py-3 text-sm font-semibold text-white ${colors.button} rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl`}
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const alert = {
  success: (title: string, message: string) => alertFn({ type: 'success', title, message }),
  error: (title: string, message: string) => alertFn({ type: 'error', title, message }),
  warning: (title: string, message: string) => alertFn({ type: 'warning', title, message }),
  info: (title: string, message: string) => alertFn({ type: 'info', title, message }),
  confirm: (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      alertFn({ 
        type: 'confirm', 
        title, 
        message, 
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  },
  prompt: (title: string, message: string, defaultValue?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const value = window.prompt(message, defaultValue);
      resolve(value);
    });
  }
};
