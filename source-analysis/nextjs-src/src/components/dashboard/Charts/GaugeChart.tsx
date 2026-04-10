'use client';

interface GaugeChartProps {
  value: number;
  max: number;
  title: string;
  unit?: string;
  color?: string;
}

export default function GaugeChart({ value, max, title, unit = '%', color = '#3b82f6' }: GaugeChartProps) {
  const percentage = (value / max) * 100;
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative w-full h-40 flex items-center justify-center">
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
            stroke={color}
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
          <div className="text-3xl font-bold text-gray-900">{value}{unit}</div>
          <div className="text-sm text-gray-500">of {max}{unit}</div>
        </div>
      </div>
    </div>
  );
}
