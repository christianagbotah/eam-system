import React from 'react';

interface MeterWidgetProps {
  title: string;
  value: number;
  unit: string;
}

export default function MeterWidget({ title, value, unit }: MeterWidgetProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}
