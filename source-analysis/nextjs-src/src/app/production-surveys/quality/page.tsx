'use client';

import { useState, useEffect } from 'react';
import { productionSurveyService } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function QualityControlPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await productionSurveyService.getAll({ status: 'Approved' });
      setSurveys(response.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalScrap = surveys.reduce((sum, s) => sum + (s.scrap_quantity || 0), 0);
  const totalRework = surveys.reduce((sum, s) => sum + (s.rework_quantity || 0), 0);
  const qualityHolds = surveys.filter(s => s.quality_hold).length;

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">✅ Quality Control Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Scrap</div>
            <div className="text-base font-semibold text-red-600">{totalScrap}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Rework</div>
            <div className="text-base font-semibold text-orange-600">{totalRework}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Quality Holds</div>
            <div className="text-base font-semibold text-purple-600">{qualityHolds}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Scrap Rate</div>
            <div className="text-base font-semibold">
              {surveys.length > 0 ? ((totalScrap / surveys.length) * 100).toFixed(2) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Survey</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scrap</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rework</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">FAI</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hold</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
              ) : (
                surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-sm">{survey.date}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.survey_code}</td>
                    <td className="px-3 py-2.5 text-sm text-red-600">{survey.scrap_quantity || 0}</td>
                    <td className="px-3 py-2.5 text-sm text-orange-600">{survey.rework_quantity || 0}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.batch_number || '-'}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {survey.first_article_pass ? '✅ Pass' : survey.first_article_pass === false ? '❌ Fail' : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {survey.quality_hold ? <span className="text-red-600 font-bold">🛑 HOLD</span> : '✅'}
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
