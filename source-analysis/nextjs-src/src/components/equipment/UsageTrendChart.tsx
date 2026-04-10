'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UsageTrendChartProps {
  data: Array<{ date: string; usage: number }>;
}

export default function UsageTrendChart({ data }: UsageTrendChartProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Usage Trend (Last 30 Days)</h4>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '10px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
          <Tooltip />
          <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
