'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Upload, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateFailureReportPage() {
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [failureModes, setFailureModes] = useState([]);
  const [formData, setFormData] = useState({
    asset_id: '',
    failure_mode_id: '',
    failure_date: '',
    detection_method: 'Breakdown',
    downtime_hours: 0,
    failure_description: '',
    immediate_action: '',
    cost_impact: 0,
    safety_impact: 'None',
    reported_by: 1
  });

  useEffect(() => {
    fetchAssets();
    fetchFailureModes();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/v1/eam/assets');
      const data = await response.json();
      setAssets(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchFailureModes = async () => {
    try {
      const response = await fetch('/api/v1/eam/failure-modes');
      const data = await response.json();
      setFailureModes(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/v1/eam/rca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('Failure report created successfully!');
        router.push('/admin/failure-analysis');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create report');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-base md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            New Failure Report
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Document equipment failure for analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asset *</label>
                <select
                  required
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Asset</option>
                  {assets.map((asset: any) => (
                    <option key={asset.id} value={asset.id}>{asset.asset_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Failure Mode *</label>
                <select
                  required
                  value={formData.failure_mode_id}
                  onChange={(e) => setFormData({ ...formData, failure_mode_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Failure Mode</option>
                  {failureModes.map((mode: any) => (
                    <option key={mode.id} value={mode.id}>{mode.failure_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Failure Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.failure_date}
                  onChange={(e) => setFormData({ ...formData, failure_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Detection Method *</label>
                <select
                  value={formData.detection_method}
                  onChange={(e) => setFormData({ ...formData, detection_method: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Inspection">Inspection</option>
                  <option value="Monitoring">Monitoring</option>
                  <option value="Operator Report">Operator Report</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Downtime (hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.downtime_hours}
                  onChange={(e) => setFormData({ ...formData, downtime_hours: parseFloat(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cost Impact ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_impact}
                  onChange={(e) => setFormData({ ...formData, cost_impact: parseFloat(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Safety Impact</label>
                <select
                  value={formData.safety_impact}
                  onChange={(e) => setFormData({ ...formData, safety_impact: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="None">None</option>
                  <option value="Minor">Minor</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Failure Description</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.failure_description}
                  onChange={(e) => setFormData({ ...formData, failure_description: e.target.value })}
                  placeholder="Describe what happened, symptoms observed, conditions at time of failure..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Immediate Action Taken</label>
                <textarea
                  rows={3}
                  value={formData.immediate_action}
                  onChange={(e) => setFormData({ ...formData, immediate_action: e.target.value })}
                  placeholder="What was done immediately to address the failure..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">Upload photos or documents</p>
              <input type="file" multiple className="hidden" id="file-upload" />
              <label
                htmlFor="file-upload"
                className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 cursor-pointer"
              >
                Choose Files
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Create Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
