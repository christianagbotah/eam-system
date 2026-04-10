import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface LicenseExpiryWarningProps {
  moduleName: string;
  daysRemaining: number;
  onDismiss?: () => void;
}

export default function LicenseExpiryWarning({ moduleName, daysRemaining, onDismiss }: LicenseExpiryWarningProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const severity = daysRemaining <= 7 ? 'critical' : daysRemaining <= 30 ? 'warning' : 'info';
  
  const styles = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${styles[severity]}`}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium">License Expiring Soon</div>
        <div className="text-sm mt-1">
          Your <strong>{moduleName}</strong> module license will expire in <strong>{daysRemaining} days</strong>.
          Please contact your administrator to renew.
        </div>
      </div>
      <button onClick={handleDismiss} className="flex-shrink-0 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
