'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface RiskAssessment {
  id: number;
  asset_id: number;
  assessment_date: string;
  assessed_by: string;
  hazard_description: string;
  risk_category: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  risk_level: string;
  mitigation_measures?: string;
  status: string;
}

import RBACGuard from '@/components/RBACGuard';

function RiskAssessmentContent() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(assessments);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? assessments.filter(a => selectedIds.includes(a.id)) : assessments;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(a => Object.values(a).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-assessment-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });
  const [formData, setFormData] = useState({
    asset_id: '',
    assessment_date: '',
    assessed_by: '',
    hazard_description: '',
    risk_category: 'safety',
    likelihood: 3,
    severity: 3,
    mitigation_measures: ''
  });

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/risk-assessment');
      const data = res.data;
      if (data.status === 'success') {
        setAssessments(data.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = showToast.loading('Saving risk assessment...');
    try {
      const res = await api.post('/risk-assessment'),
        body: JSON.stringify(formData)
      });
      const data = res.data;
      if (data.status === 'success') {
        showToast.dismiss(loadingToast);
        showToast.success('Risk assessment created successfully!');
        setShowModal(false);
        fetchAssessments();
        setFormData({ asset_id: '', assessment_date: '', assessed_by: '', hazard_description: '', risk_category: 'safety', likelihood: 3, severity: 3, mitigation_measures: '' });
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create risk assessment');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} risk assessments?`)) return;
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} assessments...`);
    try {
      await Promise.all(selectedIds.map(id => 
        api.delete(`/risk-assessment/${id}`)
      ));
      showToast.dismiss(loadingToast);
      showToast.success(`${selectedIds.length} assessments deleted`);
      clearSelection();
      fetchAssessments();
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to delete assessments');
    }
  };

  const getRiskColor = (level: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const criticalCount = assessments.filter(a => a.risk_level === 'critical' && a.status === 'open').length;
  const highCount = assessments.filter(a => a.risk_level === 'high' && a.status === 'open').length;
  const openCount = assessments.filter(a => a.status === 'open').length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Risk Assessment</h1>
            <p className="text-xs text-gray-600 mt-0.5">Identify and mitigate workplace hazards</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <span>➕</span> New Assessment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-red-600">{criticalCount}</div>
            <div className="text-xs text-gray-600 mt-0.5">Critical Risks</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-orange-600">{highCount}</div>
            <div className="text-xs text-gray-600 mt-0.5">High Risks</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-yellow-600">{openCount}</div>
            <div className="text-xs text-gray-600 mt-0.5">Open Assessments</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-lg font-semibold text-blue-600">{assessments.length}</div>
            <div className="text-xs text-gray-600 mt-0.5">Total Assessments</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Matrix</h2>
          <div className="grid grid-cols-6 gap-2">
            <div className="font-semibold text-center">Severity →</div>
            {[1,2,3,4,5].map(s => <div key={s} className="font-semibold text-center">{s}</div>)}
            {[5,4,3,2,1].map(l => (
              <>
                <div key={`l${l}`} className="font-semibold flex items-center">L:{l}</div>
                {[1,2,3,4,5].map(s => {
                  const score = l * s;
                  const color = score >= 20 ? 'bg-red-500' : score >= 12 ? 'bg-orange-500' : score >= 6 ? 'bg-yellow-500' : 'bg-green-500';
                  return <div key={`${l}-${s}`} className={`${color} text-white text-center py-4 rounded`}>{score}</div>;
                })}
              </>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BulkActions
            selectedIds={selectedIds}
            totalCount={assessments.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleExport}
          />
          {loading ? (
            <TableSkeleton rows={10} />
          ) : assessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No assessments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={selectedIds.length === assessments.length && assessments.length > 0} onChange={selectAll} />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Asset ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Hazard</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">L×S</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Risk Level</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <input type="checkbox" checked={isSelected(assessment.id)} onChange={() => toggleSelect(assessment.id)} />
                      </td>
                      <td className="px-4 py-3 text-sm">Asset #{assessment.asset_id}</td>
                      <td className="px-4 py-3 text-sm">{new Date(assessment.assessment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{assessment.hazard_description.substring(0, 50)}...</td>
                      <td className="px-4 py-3 text-sm capitalize">{assessment.risk_category}</td>
                      <td className="px-4 py-3 text-sm font-medium">{assessment.likelihood}×{assessment.severity}={assessment.risk_score}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(assessment.risk_level)}`}>
                          {assessment.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{assessment.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">New Risk Assessment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asset ID</label>
                  <input type="number" required value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assessment Date</label>
                  <input type="date" required value={formData.assessment_date} onChange={(e) => setFormData({...formData, assessment_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assessed By</label>
                <input type="text" required value={formData.assessed_by} onChange={(e) => setFormData({...formData, assessed_by: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select required value={formData.risk_category} onChange={(e) => setFormData({...formData, risk_category: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="safety">Safety</option>
                  <option value="environmental">Environmental</option>
                  <option value="operational">Operational</option>
                  <option value="financial">Financial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Hazard Description</label>
                <textarea required value={formData.hazard_description} onChange={(e) => setFormData({...formData, hazard_description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Likelihood (1-5)</label>
                  <input type="number" required min="1" max="5" value={formData.likelihood} onChange={(e) => setFormData({...formData, likelihood: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Severity (1-5)</label>
                  <input type="number" required min="1" max="5" value={formData.severity} onChange={(e) => setFormData({...formData, severity: parseInt(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mitigation Measures</label>
                <textarea value={formData.mitigation_measures} onChange={(e) => setFormData({...formData, mitigation_measures: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function RiskAssessmentPage() {
  return (
    <RBACGuard module="risk_assessment" action="view">
      <RiskAssessmentContent />
    </RBACGuard>
  );
}
