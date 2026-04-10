import { CheckCircle, XCircle, AlertTriangle, Clock, Shield } from 'lucide-react';

interface ModuleStatusBadgeProps {
  status: 'active' | 'expiring_soon' | 'grace_period' | 'expired' | 'not_activated' | 'core';
  daysRemaining?: number;
}

export default function ModuleStatusBadge({ status, daysRemaining }: ModuleStatusBadgeProps) {
  const badges = {
    core: {
      icon: Shield,
      className: 'bg-blue-100 text-blue-800',
      label: 'Core Module'
    },
    active: {
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800',
      label: 'Active'
    },
    expiring_soon: {
      icon: AlertTriangle,
      className: 'bg-yellow-100 text-yellow-800',
      label: `Expiring (${daysRemaining}d)`
    },
    grace_period: {
      icon: Clock,
      className: 'bg-orange-100 text-orange-800',
      label: 'Grace Period'
    },
    expired: {
      icon: XCircle,
      className: 'bg-red-100 text-red-800',
      label: 'Expired'
    },
    not_activated: {
      icon: XCircle,
      className: 'bg-gray-100 text-gray-800',
      label: 'Not Activated'
    }
  };

  const badge = badges[status] || badges.not_activated;
  const Icon = badge.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
      <Icon className="w-3 h-3" />
      {badge.label}
    </span>
  );
}
