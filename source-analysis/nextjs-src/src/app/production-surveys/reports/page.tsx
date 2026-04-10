'use client';

import { useState } from 'react';
import { productionSurveyService } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    machine_id: '',
    shift: ''
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [surveys, kpis] = await Promise.all([
        productionSurveyService.getAll(filters),
        productionSurveyService.getKPIs(filters)
      ]);
      setReportData({ surveys: surveys.data, kpis: kpis.data });
    } catch (error) {
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">Production Survey Reports</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Report Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Machine ID</label>
              <input
                type="number"
                value={filters.machine_id}
                onChange={(e) => setFilters({...filters, machine_id: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Shift</label>
              <select
                value={filters.shift}
                onChange={(e) => setFilters({...filters, shift: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Shifts</option>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={generateReport}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            {reportData && (
              <button
                onClick={exportToPDF}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Export to PDF
              </button>
            )}
          </div>
        </div>

        {reportData && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Summary KPIs</h2>
                <div className="text-sm text-gray-600">
                  Period: {filters.date_from || 'All'} to {filters.date_to || 'All'}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm text-gray-600">Total Runtime</div>
                  <div className="text-base font-semibold">{reportData.kpis.total_runtime} min</div>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <div className="text-sm text-gray-600">Total Downtime</div>
                  <div className="text-base font-semibold text-red-600">{reportData.kpis.total_downtime} min</div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-sm text-gray-600">OEE Availability</div>
                  <div className="text-base font-semibold text-green-600">{reportData.kpis.oee_availability}%</div>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <div className="text-sm text-gray-600">Total Defects</div>
                  <div className="text-base font-semibold text-orange-600">{reportData.kpis.total_defects}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Downtime Analysis</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Downtime Impact</span>
                    <span className="font-semibold text-red-600">
                      {((reportData.kpis.total_downtime / (reportData.kpis.total_runtime + reportData.kpis.total_downtime)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-red-500 h-4 rounded-full" 
                      style={{width: `${(reportData.kpis.total_downtime / (reportData.kpis.total_runtime + reportData.kpis.total_downtime)) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Runtime Efficiency</span>
                    <span className="font-semibold text-green-600">{reportData.kpis.oee_availability}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full" 
                      style={{width: `${reportData.kpis.oee_availability}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Survey Details ({reportData.surveys.length} records)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Machine</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Shift</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Runtime</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Downtime</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Defects</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.surveys.map((survey: any) => (
                      <tr key={survey.id}>
                        <td className="px-4 py-2 text-sm">{survey.survey_code}</td>
                        <td className="px-4 py-2 text-sm">{survey.date}</td>
                        <td className="px-4 py-2 text-sm">{survey.machine_name}</td>
                        <td className="px-4 py-2 text-sm">{survey.shift}</td>
                        <td className="px-4 py-2 text-sm">{survey.runtime_minutes} min</td>
                        <td className="px-4 py-2 text-sm text-red-600">{survey.downtime_minutes} min</td>
                        <td className="px-4 py-2 text-sm">{survey.defects_count}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs rounded ${
                            survey.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                          }`}>
                            {survey.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
