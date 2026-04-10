'use client';

import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

interface AvailabilityBadgeProps {
  available: number;
  required: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AvailabilityBadge({ available, required, unit = '', size = 'md' }: AvailabilityBadgeProps) {
  const getStatus = () => {
    if (available >= required) return 'available';
    if (available > 0) return 'partial';
    if (available === 0) return 'unavailable';
    return 'unknown';
  };

  const status = getStatus();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const configs = {
    available: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircle,
      label: 'In Stock'
    },
    partial: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      icon: AlertTriangle,
      label: 'Low Stock'
    },
    unavailable: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircle,
      label: 'Out of Stock'
    },
    unknown: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: HelpCircle,
      label: 'Unknown'
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.text} ${sizeClasses[size]} font-medium`}>
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
      {status !== 'unknown' && (
        <span className="font-normal">
          ({available}/{required} {unit})
        </span>
      )}
    </div>
  );
}
