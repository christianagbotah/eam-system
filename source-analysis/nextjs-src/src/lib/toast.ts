// Toast Notification System
import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => toast.success(message, { 
    duration: 3000,
    position: 'top-right',
    style: { background: '#10b981', color: '#fff' }
  }),
  error: (message: string) => toast.error(message, { 
    duration: 4000,
    position: 'top-right',
    style: { background: '#ef4444', color: '#fff' }
  }),
  warning: (message: string) => toast(message, { 
    duration: 3500,
    icon: '⚠️',
    position: 'top-right',
    style: { background: '#f59e0b', color: '#fff' }
  }),
  info: (message: string) => toast(message, { 
    duration: 3000,
    icon: 'ℹ️',
    position: 'top-right',
    style: { background: '#3b82f6', color: '#fff' }
  }),
  loading: (message: string) => toast.loading(message, { position: 'top-right' }),
  dismiss: (id?: string) => toast.dismiss(id),
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs, { position: 'top-right' })
};
