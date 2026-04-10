'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, DollarSign, FileText, CheckCircle, Plus } from 'lucide-react';

export default function FailureReportDetailsPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<any>(null);
  const [rca, setRca] = useState<any>(null);
  const [capa, setCapa] = useState<any[]>([]);
  const [showRCAForm, setShowRCAForm] = useState(false);
  const [showCAPAForm, setShowCAPAForm] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/v1/eam/rca/${params.id}`);
      const data = await response.json();
      setReport(data.data.report);
      setRca(data.data.rca);
      setCapa(data.data.capa || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'Open': 'bg-red-100 text-red-800',
      'Under Investigation': 'bg-yellow-100 text-yellow-800',
      'RCA Complete': 'bg-blue-100 text-blue-800',
      'CAPA In Progress': 'bg-purple-100 text-purple-800',
      'Closed': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                {report.report_number}
              </h1>
              <p className="text-gray-600 mt-1">{report.asset_name}</p>
            </div>
            <span className={`mt-4 md:mt-0 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
              {report.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Downtime</p>
                <p className="font-semibold text-gray-900">{report.downtime_hours}h</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Cost Impact</p>
                <p className="font-semibold text-gray-900">${report.cost_impact}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Failure Mode</p>
                <p className="font-semibold text-gray-900">{report.failure_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Safety Impact</p>
                <p className="font-semibold text-gray-900">{report.safety_impact}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Failure Description */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Failure Description</h2>
          <p className="text-gray-700 mb-4">{report.failure_description}</p>
          {report.immediate_action && (
            <>
              <h3 className="text-md font-semibold text-gray-900 mb-2">Immediate Action</h3>
              <p className="text-gray-700">{report.immediate_action}</p>
            </>
          )}
        </div>

        {/* Root Cause Analysis */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Root Cause Analysis</h2>
            {!rca && (
              <button
                onClick={() => setShowRCAForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add RCA
              </button>
            )}
          </div>

          {rca ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Analysis Method</p>
                  <p className="font-medium text-gray-900">{rca.analysis_method}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Root Cause Category</p>
                  <p className="font-medium text-gray-900">{rca.root_cause_category}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Root Cause Description</p>
                <p className="text-gray-900">{rca.root_cause_description}</p>
              </div>
              {rca.contributing_factors && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contributing Factors</p>
                  <p className="text-gray-900">{rca.contributing_factors}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No RCA performed yet</p>
          )}
        </div>

        {/* Corrective Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Corrective Actions (CAPA)</h2>
            <button
              onClick={() => setShowCAPAForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Action
            </button>
          </div>

          {capa.length > 0 ? (
            <div className="space-y-4">
              {capa.map((action: any) => (
                <div key={action.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          action.action_type === 'Corrective' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {action.action_type}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          action.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                          action.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {action.priority}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium">{action.action_description}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Due: {new Date(action.due_date).toLocaleDateString()} | 
                        Assigned to: User #{action.assigned_to}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      action.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      action.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {action.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No corrective actions defined yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
