'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Settings, Download, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CustomReportsPage() {
  const [reportConfig, setReportConfig] = useState({
    name: '',
    module: '',
    fields: [] as string[],
    filters: {},
    groupBy: '',
    sortBy: ''
  });

  const modules = ['Assets', 'Maintenance', 'Inventory', 'Production', 'Quality', 'Safety'];
  const savedReports = [
    { id: 1, name: 'Monthly Asset Summary', module: 'Assets', created: '2024-01-15' },
    { id: 2, name: 'Weekly Maintenance Report', module: 'Maintenance', created: '2024-01-10' },
    { id: 3, name: 'Inventory Turnover', module: 'Inventory', created: '2024-01-05' }
  ];

  const generateReport = () => {
    toast.success('Generating custom report...');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Custom Report Builder</h1>
          <p className="text-gray-600 mt-1">Create custom reports with flexible configurations</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">Build New Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                <input
                  type="text"
                  value={reportConfig.name}
                  onChange={(e) => setReportConfig({ ...reportConfig, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter report name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select
                  value={reportConfig.module}
                  onChange={(e) => setReportConfig({ ...reportConfig, module: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Module</option>
                  {modules.map(module => (
                    <option key={module} value={module}>{module}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <input
                  type="text"
                  value={reportConfig.groupBy}
                  onChange={(e) => setReportConfig({ ...reportConfig, groupBy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Category, Department"
                />
              </div>
              <button
                onClick={generateReport}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">Saved Reports</h2>
            <div className="space-y-3">
              {savedReports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{report.module} • {report.created}</p>
                    </div>
                    <button
                      onClick={() => toast.success(`Generating ${report.name}...`)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium"
                    >
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
