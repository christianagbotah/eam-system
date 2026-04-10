'use client';

interface UsageGaugeProps {
  current: number;
  max: number;
  title: string;
  unit?: string;
}

export default function UsageGauge({ current, max, title, unit = 'hrs' }: UsageGaugeProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const rotation = (percentage / 100) * 180 - 90;
  
  const getColor = () => {
    if (percentage < 60) return '#10b981';
    if (percentage < 85) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="relative w-full h-32 flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={getColor()}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
          />
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="40"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${rotation} 100 100)`}
          />
          <circle cx="100" cy="100" r="8" fill="#374151" />
        </svg>
        <div className="absolute bottom-0 text-center">
          <div className="text-2xl font-bold text-gray-900">{current}{unit}</div>
          <div className="text-xs text-gray-500">of {max}{unit}</div>
        </div>
      </div>
    </div>
  );
}
