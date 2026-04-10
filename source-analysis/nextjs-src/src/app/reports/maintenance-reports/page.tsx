'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MaintenanceReportsPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const reports = [
    { id: 1, name: 'Work Order Summary', description: 'Summary of all work orders' },
    { id: 2, name: 'PM Compliance', description: 'Preventive maintenance compliance' },
    { id: 3, name: 'Maintenance Costs', description: 'Cost analysis by asset' },
    { id: 4, name: 'Downtime Analysis', description: 'Equipment downtime tracking' },
    { id: 5, name: 'MTBF/MTTR Report', description: 'Reliability metrics' },
    { id: 6, name: 'Technician Performance', description: 'Technician productivity' }
  ];

  const generateReport = (reportName: string) => {
    toast.success(`Generating ${reportName}...`);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Reports</h1>
          <p className="text-gray-600 mt-1">Generate maintenance and reliability reports</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Date Range</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{report.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                </div>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <button onClick={() => generateReport(report.name)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Generate
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
