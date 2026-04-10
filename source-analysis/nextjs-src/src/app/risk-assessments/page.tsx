'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export default function RiskAssessmentsPage() {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    api.get('/api/v1/eam/risk/assessments')
      .then(r => r.data)
      .then(d => setAssessments(d.data || []));
  }, []);

  const getRiskColor = (level: string) => {
    const colors = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-orange-100 text-orange-800',
      Critical: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100';
  };

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Risk Assessments</h1>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {['Low', 'Medium', 'High', 'Critical'].map(level => (
          <div key={level} className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">{level} Risk</div>
            <div className="text-base font-semibold">{assessments.filter((a: any) => a.risk_level === level).length}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assessments.map((a: any) => (
              <tr key={a.id}>
                <td className="px-6 py-4">{a.assessment_code}</td>
                <td className="px-6 py-4">{a.task_description?.substring(0, 50)}...</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(a.risk_level)}`}>
                    {a.risk_level}
                  </span>
                </td>
                <td className="px-6 py-4">{a.overall_risk_score}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${a.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
