'use client';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label?: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${colors[status]} animate-pulse`} />
      {label && <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>}
    </div>
  );
}
