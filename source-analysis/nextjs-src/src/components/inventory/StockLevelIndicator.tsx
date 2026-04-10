'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface StockLevelIndicatorProps {
  current: number;
  reorderLevel: number;
  max?: number;
  unit?: string;
  showLabel?: boolean;
}

export default function StockLevelIndicator({ 
  current, 
  reorderLevel, 
  max, 
  unit = 'units',
  showLabel = true 
}: StockLevelIndicatorProps) {
  const maxValue = max || reorderLevel * 3;
  const percentage = Math.min((current / maxValue) * 100, 100);
  const reorderPercentage = (reorderLevel / maxValue) * 100;

  const getStatus = () => {
    if (current === 0) return 'empty';
    if (current < reorderLevel) return 'low';
    if (current < reorderLevel * 1.5) return 'medium';
    return 'good';
  };

  const status = getStatus();

  const statusConfig = {
    empty: {
      color: 'bg-red-600',
      bgLight: 'bg-red-100',
      text: 'text-red-700',
      icon: TrendingDown,
      label: 'Out of Stock'
    },
    low: {
      color: 'bg-amber-500',
      bgLight: 'bg-amber-100',
      text: 'text-amber-700',
      icon: TrendingDown,
      label: 'Low Stock'
    },
    medium: {
      color: 'bg-blue-500',
      bgLight: 'bg-blue-100',
      text: 'text-blue-700',
      icon: Minus,
      label: 'Adequate'
    },
    good: {
      color: 'bg-green-500',
      bgLight: 'bg-green-100',
      text: 'text-green-700',
      icon: TrendingUp,
      label: 'Good Stock'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.text}`} />
            <span className={`font-medium ${config.text}`}>{config.label}</span>
          </div>
          <span className="text-gray-600">
            {current} / {maxValue} {unit}
          </span>
        </div>
      )}

      <div className="relative">
        {/* Background bar */}
        <div className={`h-3 rounded-full ${config.bgLight} overflow-hidden`}>
          {/* Current stock bar */}
          <div
            className={`h-full ${config.color} transition-all duration-300 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Reorder level marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-800"
          style={{ left: `${reorderPercentage}%` }}
          title={`Reorder Level: ${reorderLevel}`}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-800 rounded-full" />
        </div>
      </div>

      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>Reorder: {reorderLevel}</span>
          <span>Max: {maxValue}</span>
        </div>
      )}
    </div>
  );
}
