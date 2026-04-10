'use client';

import { useState, useEffect } from 'react';
import { productionSurveyService } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function PerformancePage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await productionSurveyService.getAll({ status: 'Approved' });
      setSurveys((response.data as any)?.filter((s: any) => s.target_units > 0));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgEfficiency = surveys.length > 0
    ? surveys.reduce((sum, s) => sum + (parseFloat(s.efficiency_percent) || 0), 0) / surveys.length
    : 0;

  const bonusEligible = surveys.filter(s => s.bonus_eligible).length;

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">🎯 Performance Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Avg Efficiency</div>
            <div className="text-base font-semibold text-green-600">{avgEfficiency.toFixed(2)}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Surveys with Targets</div>
            <div className="text-base font-semibold">{surveys.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Bonus Eligible</div>
            <div className="text-base font-semibold text-blue-600">{bonusEligible}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Above Target</div>
            <div className="text-base font-semibold text-purple-600">
              {surveys.filter(s => (parseFloat(s.efficiency_percent) || 0) > 100).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Survey</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
              ) : surveys.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No performance data yet</td></tr>
              ) : (
                surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-sm">{survey.date}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.survey_code}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.target_units}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.units_produced}</td>
                    <td className="px-3 py-2.5 text-sm">
                      <span className={`font-semibold ${
                        (parseFloat(survey.efficiency_percent) || 0) >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(survey.efficiency_percent || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <span className={`${
                        (parseFloat(survey.variance_percent) || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(survey.variance_percent || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {survey.bonus_eligible ? '✅' : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
