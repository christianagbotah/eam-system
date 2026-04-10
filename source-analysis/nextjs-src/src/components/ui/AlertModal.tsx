'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  type: 'loading' | 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const AlertContext = createContext<{
  showAlert: (config: Omit<AlertState, 'isOpen'>) => void;
  hideAlert: () => void;
}>({
  showAlert: () => {},
  hideAlert: () => {},
});

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (alert.isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [alert.isOpen]);

  const showAlert = (config: Omit<AlertState, 'isOpen'>) => {
    setAlert({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    alert.onConfirm?.();
    hideAlert();
  };

  const handleCancel = () => {
    alert.onCancel?.();
    hideAlert();
  };

  if (!shouldRender) return <>{children}</>;

  return (
    <>
      {children}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/50' : 'bg-black/0'
      }`}>
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-2 rounded-full ${
              alert.type === 'loading' ? 'bg-blue-100' :
              alert.type === 'success' ? 'bg-green-100' :
              alert.type === 'error' ? 'bg-red-100' :
              alert.type === 'warning' ? 'bg-yellow-100' :
              alert.type === 'confirm' ? 'bg-orange-100' :
              'bg-blue-100'
            }`}>
              {alert.type === 'loading' && <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />}
              {alert.type === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
              {alert.type === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
              {alert.type === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
              {alert.type === 'confirm' && <AlertTriangle className="h-6 w-6 text-orange-600" />}
              {alert.type === 'info' && <Info className="h-6 w-6 text-blue-600" />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {alert.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {alert.message}
              </p>
            </div>
            {alert.type !== 'loading' && (
              <button onClick={hideAlert} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {alert.type === 'confirm' && (
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                Confirm
              </button>
            </div>
          )}
          
          {(alert.type === 'success' || alert.type === 'error' || alert.type === 'warning' || alert.type === 'info') && (
            <div className="flex justify-end mt-6">
              <button
                onClick={hideAlert}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}

let alertFn: (config: Omit<AlertState, 'isOpen'>) => void = () => {};
let hideAlertFn: () => void = () => {};

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (alert.isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [alert.isOpen]);

  const showAlert = (config: Omit<AlertState, 'isOpen'>) => {
    setAlert({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  alertFn = showAlert;
  hideAlertFn = hideAlert;

  const handleConfirm = () => {
    alert.onConfirm?.();
    hideAlert();
  };

  const handleCancel = () => {
    alert.onCancel?.();
    hideAlert();
  };

  return (
    <>
      {children}
      {shouldRender && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isVisible ? 'bg-black/50' : 'bg-black/0'
        }`}>
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-2 rounded-full ${
                alert.type === 'loading' ? 'bg-blue-100' :
                alert.type === 'success' ? 'bg-green-100' :
                alert.type === 'error' ? 'bg-red-100' :
                alert.type === 'warning' ? 'bg-yellow-100' :
                alert.type === 'confirm' ? 'bg-orange-100' :
                'bg-blue-100'
              }`}>
                {alert.type === 'loading' && <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />}
                {alert.type === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
                {alert.type === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
                {alert.type === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
                {alert.type === 'confirm' && <AlertTriangle className="h-6 w-6 text-orange-600" />}
                {alert.type === 'info' && <Info className="h-6 w-6 text-blue-600" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {alert.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {alert.message}
                </p>
              </div>
              {alert.type !== 'loading' && (
                <button onClick={hideAlert} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {alert.type === 'confirm' && (
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  Confirm
                </button>
              </div>
            )}
            
            {(alert.type === 'success' || alert.type === 'error' || alert.type === 'warning' || alert.type === 'info') && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={hideAlert}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export const alert = {
  loading: (title: string, message: string) => alertFn({ type: 'loading', title, message }),
  success: (title: string, message: string) => alertFn({ type: 'success', title, message }),
  error: (title: string, message: string) => alertFn({ type: 'error', title, message }),
  warning: (title: string, message: string) => alertFn({ type: 'warning', title, message }),
  info: (title: string, message: string) => alertFn({ type: 'info', title, message }),
  confirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => 
    alertFn({ type: 'confirm', title, message, onConfirm, onCancel }),
  hide: () => hideAlertFn(),
};
