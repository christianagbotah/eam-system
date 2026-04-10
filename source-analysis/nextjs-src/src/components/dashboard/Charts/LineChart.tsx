'use client';

import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: Array<any>;
  title: string;
  dataKeys: Array<{ key: string; color: string; name: string }>;
}

export default function LineChart({ data, title, dataKeys }: LineChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLine data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip />
          <Legend />
          {dataKeys.map((dk) => (
            <Line key={dk.key} type="monotone" dataKey={dk.key} stroke={dk.color} name={dk.name} strokeWidth={2} />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}
