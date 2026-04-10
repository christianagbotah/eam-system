'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productionSurveyService, ProductionSurvey, SurveyKPIs } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function ProductionSurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<ProductionSurvey[]>([]);
  const [kpis, setKpis] = useState<SurveyKPIs | null>(null);
  const [filters, setFilters] = useState({
    machine_id: '',
    status: '',
    shift: '',
    date_from: '',
    date_to: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedSurveys, setSelectedSurveys] = useState<number[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [surveysRes, kpisRes] = await Promise.all([
        productionSurveyService.getAll(filters),
        productionSurveyService.getKPIs(filters)
      ]);
      setSurveys(surveysRes.data);
      setKpis(kpisRes.data);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this survey?')) {
      try {
        await productionSurveyService.delete(id);
        loadData();
      } catch (error) {
        alert('Error deleting survey');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      Draft: 'bg-gray-200 text-gray-800',
      Submitted: 'bg-blue-200 text-blue-800',
      Approved: 'bg-green-200 text-green-800',
      Rejected: 'bg-red-200 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-200';
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-base font-semibold">Production Surveys</h1>
            {selectedSurveys.length > 0 && (
              <p className="text-sm text-xs text-gray-600 mt-0.5">{selectedSurveys.length} selected</p>
            )}
          </div>
          <div className="flex gap-2">
            {selectedSurveys.length > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                📥 Export Selected
              </button>
            )}
            <button
              onClick={() => router.push('/production-surveys/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + New Survey
            </button>
          </div>
        </div>

        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Runtime</div>
              <div className="text-base font-semibold">{kpis.total_runtime} min</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Downtime</div>
              <div className="text-base font-semibold text-red-600">{kpis.total_downtime} min</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Defects</div>
              <div className="text-base font-semibold text-orange-600">{kpis.total_defects}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">OEE Availability</div>
              <div className="text-base font-semibold text-green-600">{kpis.oee_availability}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Defect Rate</div>
              <div className="text-base font-semibold">{kpis.defect_rate}</div>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <select
              value={filters.shift}
              onChange={(e) => setFilters({...filters, shift: e.target.value})}
              className="border rounded px-3 py-2"
            >
              <option value="">All Shifts</option>
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button
              onClick={() => setFilters({machine_id: '', status: '', shift: '', date_from: '', date_to: ''})}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSurveys.length === surveys.length && surveys.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSurveys(surveys.map(s => s.id));
                      } else {
                        setSelectedSurveys([]);
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
              ) : surveys.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4">No surveys found</td></tr>
              ) : (
                surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSurveys.includes(survey.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSurveys([...selectedSurveys, survey.id]);
                          } else {
                            setSelectedSurveys(selectedSurveys.filter(id => id !== survey.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium">{survey.survey_code}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.machine_name}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.date}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.shift}</td>
                    <td className="px-3 py-2.5 text-sm">{survey.operator_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(survey.status!)}`}>
                        {survey.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm space-x-2">
                      <button
                        onClick={() => router.push(`/production-surveys/${survey.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      {survey.status === 'Draft' && (
                        <>
                          <button
                            onClick={() => router.push(`/production-surveys/${survey.id}/edit`)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(survey.id!)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
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
