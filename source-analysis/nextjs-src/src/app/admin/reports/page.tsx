'use client';

import { useState } from 'react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';
import RBACGuard from '@/components/RBACGuard';

const reports = [
  { id: 1, name: 'BOM Cost Rollup', description: 'Complete cost breakdown by asset', icon: '📋', endpoint: '/bom' },
  { id: 2, name: 'Calibration Compliance', description: 'Overdue and upcoming calibrations', icon: '🎯', endpoint: '/calibration' },
  { id: 3, name: 'Downtime Pareto', description: 'Top downtime reasons analysis', icon: '⏱️', endpoint: '/downtime/analysis' },
  { id: 4, name: 'OEE Trend Analysis', description: '30-day OEE performance trends', icon: '📊', endpoint: '/oee/dashboard' },
  { id: 5, name: 'Training Compliance', description: 'Employee training status matrix', icon: '🎓', endpoint: '/training' },
  { id: 6, name: 'Meter Readings', description: 'Equipment meter data history', icon: '📊', endpoint: '/meter-readings' },
  { id: 7, name: 'Work Order Summary', description: 'WO completion and backlog', icon: '🔧', endpoint: '/work-orders' },
  { id: 8, name: 'Asset Health', description: 'Asset condition and criticality', icon: '🏭', endpoint: '/assets-unified' }
];

function ReportsContent() {
  const [generating, setGenerating] = useState<number | null>(null);

  useKeyboardShortcuts({});

  const generateReport = async (report: typeof reports[0]) => {
    setGenerating(report.id);
    const loadingToast = showToast.loading(`Generating ${report.name}...`);
    try {
      const res = await api.get(`${report.endpoint}`);
      const data = res.data;
      if (data.status === 'success') {
        const { exportToCSV } = require('@/lib/exportUtils');
        exportToCSV(data.data, report.name.toLowerCase().replace(/\s+/g, '-'));
        showToast.dismiss(loadingToast);
        showToast.success(`${report.name} generated successfully`);
      } else {
        showToast.dismiss(loadingToast);
        showToast.error('Failed to generate report');
      }
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-600 mt-0.5">Generate and export system reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">{report.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <button
                onClick={() => generateReport(report)}
                disabled={generating === report.id}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {generating === report.id ? (
                  <>⏳ Generating...</>
                ) : (
                  <>📥 Generate Report</>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📌 Report Features</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ Instant CSV export for all reports</li>
            <li>✅ Real-time data from live system</li>
            <li>✅ Compatible with Excel and Google Sheets</li>
            <li>✅ Timestamped filenames for tracking</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <RBACGuard module="reports" action="view">
      <ReportsContent />
    </RBACGuard>
  );
}
