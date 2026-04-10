let showAlertFn: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void = () => {};

export function setShowAlert(fn: typeof showAlertFn) {
  showAlertFn = fn;
}

export const alert = {
  success: (title: string, message: string) => showAlertFn(title, message, 'success'),
  error: (title: string, message: string) => showAlertFn(title, message, 'error'),
  warning: (title: string, message: string) => showAlertFn(title, message, 'warning'),
  info: (title: string, message: string) => showAlertFn(title, message, 'info'),
};
