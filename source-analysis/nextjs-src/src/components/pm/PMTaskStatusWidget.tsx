'use client';

interface PMTaskStatusWidgetProps {
  remainingLife: number;
  nextDueDate?: string;
  assetName: string;
  maintenanceType: string;
}

export default function PMTaskStatusWidget({ 
  remainingLife, 
  nextDueDate, 
  assetName, 
  maintenanceType 
}: PMTaskStatusWidgetProps) {
  const getLifeColor = (life: number) => {
    if (life <= 10) return 'red';
    if (life <= 25) return 'orange';
    if (life <= 50) return 'yellow';
    return 'green';
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-50',
          text: 'text-red-600',
          progress: 'bg-red-500',
          ring: 'ring-red-200'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-600',
          progress: 'bg-orange-500',
          ring: 'ring-orange-200'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-600',
          progress: 'bg-yellow-500',
          ring: 'ring-yellow-200'
        };
      default:
        return {
          bg: 'bg-green-50',
          text: 'text-green-600',
          progress: 'bg-green-500',
          ring: 'ring-green-200'
        };
    }
  };

  const color = getLifeColor(remainingLife);
  const colorClasses = getColorClasses(color);

  return (
    <div className={`${colorClasses.bg} rounded-lg p-4 ring-1 ${colorClasses.ring}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Asset Health</h4>
        <span className={`text-lg font-bold ${colorClasses.text}`}>
          {remainingLife}%
        </span>
      </div>
      
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Remaining Life</span>
          <span>{remainingLife}%</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className={`${colorClasses.progress} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(remainingLife, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div><span className="font-medium">Asset:</span> {assetName}</div>
        <div><span className="font-medium">Type:</span> {maintenanceType}</div>
        {nextDueDate && (
          <div>
            <span className="font-medium">Next Due:</span> {' '}
            {new Date(nextDueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
