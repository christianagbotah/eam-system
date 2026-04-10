'use client';

interface PMStatusWidgetProps {
  title: string;
  count: number;
  color: 'red' | 'orange' | 'blue' | 'green' | 'gray';
  subtitle?: string;
  progress?: number;
}

export default function PMStatusWidget({ title, count, color, subtitle, progress }: PMStatusWidgetProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-50',
          text: 'text-red-600',
          icon: 'text-red-400',
          progress: 'bg-red-500'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-600',
          icon: 'text-orange-400',
          progress: 'bg-orange-500'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          icon: 'text-blue-400',
          progress: 'bg-blue-500'
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          text: 'text-green-600',
          icon: 'text-green-400',
          progress: 'bg-green-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          icon: 'text-gray-400',
          progress: 'bg-gray-500'
        };
    }
  };

  const colorClasses = getColorClasses(color);

  const getIcon = () => {
    switch (title.toLowerCase()) {
      case 'due today':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'due this week':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        );
      case 'waiting':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1-5a1 1 0 112 0v3a1 1 0 11-2 0v-3zm1-3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case 'generated':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`${colorClasses.bg} rounded-lg p-6`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`${colorClasses.icon}`}>
            {getIcon()}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className={`text-lg font-medium ${colorClasses.text}`}>
                {count.toLocaleString()}
              </div>
              {subtitle && (
                <div className="text-sm text-gray-500">{subtitle}</div>
              )}
            </dd>
          </dl>
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">Progress</div>
            <div className={colorClasses.text}>{progress}%</div>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className={`${colorClasses.progress} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
