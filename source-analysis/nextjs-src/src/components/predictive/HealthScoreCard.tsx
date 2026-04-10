'use client';

import { useEffect, useState } from 'react';

export default function HealthScoreCard({ assetId }: { assetId: number }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/v1/eam/predictive/health/${assetId}`)
      .then(res => res.json())
      .then(setData);
  }, [assetId]);

  if (!data) return <div>Loading...</div>;

  const getColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Predictive Health</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Health Score</p>
          <p className={`text-4xl font-bold ${getColor(data.health_score)}`}>
            {data.health_score}%
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Failure Probability</p>
          <p className="text-2xl font-semibold">{data.failure_probability}%</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Remaining Useful Life</p>
          <p className="text-2xl font-semibold">{data.remaining_useful_life} days</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Risk Level</p>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            data.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
            data.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
            data.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {data.risk_level.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
