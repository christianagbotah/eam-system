'use client';

import { useState, useEffect } from 'react';
import { productionSurveyService } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function SafetyIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const response = await productionSurveyService.getAll({});
      const safetyIncidents = (response.data as any)?.filter((s: any) => s.safety_incident);
      setIncidents(safetyIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIncidentBadge = (type: string) => {
    const colors: any = {
      near_miss: 'bg-yellow-100 text-yellow-800',
      injury: 'bg-red-100 text-red-800',
      spill: 'bg-orange-100 text-orange-800',
      equipment_damage: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100';
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">⚠️ Safety Incidents</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Incidents</div>
            <div className="text-base font-semibold">{incidents.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Near Miss</div>
            <div className="text-base font-semibold text-yellow-600">
              {incidents.filter(i => i.safety_incident_type === 'near_miss').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Injuries</div>
            <div className="text-base font-semibold text-red-600">
              {incidents.filter(i => i.safety_incident_type === 'injury').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Environmental</div>
            <div className="text-base font-semibold text-green-600">
              {incidents.filter(i => i.environmental_incident).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Survey</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">PPE</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">LOTO</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4">No safety incidents</td></tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-sm">{incident.date}</td>
                    <td className="px-3 py-2.5 text-sm">{incident.survey_code}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${getIncidentBadge(incident.safety_incident_type)}`}>
                        {incident.safety_incident_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">{incident.machine_name}</td>
                    <td className="px-3 py-2.5 text-sm">{incident.operator_name}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {incident.ppe_compliant ? '✅' : '❌'}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {incident.loto_verified ? '✅' : '❌'}
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
