'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function ProductionReports() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('data_sheet');
  const [dateRange, setDateRange] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const generateReport = async (type: string) => {
    setLoading(true);
    const loadingToast = showToast.loading('Generating report...');

    try {
      const endpoint = type === 'data_sheet' ? 'data-sheet' : 'summary';
      const url = `/api/v1/eam/production-reports/${endpoint}?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`;
      
      window.open(url, '_blank');

      showToast.dismiss(loadingToast);
      showToast.success('Report generated successfully!');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Production Reports
          </h1>
          <p className="text-slate-600 mt-1">Generate comprehensive production reports</p>
        </div>

        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Date Range</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
              <input type="date" value={dateRange.start_date} onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
              <input type="date" value={dateRange.end_date} onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-blue-200 p-6 hover:scale-105 transition-all cursor-pointer" onClick={() => generateReport('data_sheet')}>
            <div className="flex items-start gap-2">
              <div className="p-3 bg-blue-500 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-2">Production Data Sheet</h3>
                <p className="text-sm text-blue-700 mb-4">Detailed daily production data with all stoppages, time tracking, and production by shift</p>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Work center details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>All stoppages breakdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Production by shift</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Productive time calculation</span>
                  </div>
                </div>
                <button disabled={loading} className="mt-4 w-full px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-medium disabled:opacity-50">
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border-2 border-purple-200 p-6 hover:scale-105 transition-all cursor-pointer" onClick={() => generateReport('summary')}>
            <div className="flex items-start gap-2">
              <div className="p-3 bg-purple-500 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-purple-900 mb-2">Production Summary</h3>
                <p className="text-sm text-purple-700 mb-4">Aggregated metrics with utilization, speed, productivity, and efficiency analysis</p>
                <div className="space-y-2 text-sm text-purple-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Total production yards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Utilization vs standard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Speed vs standard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Efficiency metrics</span>
                  </div>
                </div>
                <button disabled={loading} className="mt-4 w-full px-2 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all font-medium disabled:opacity-50">
                  {loading ? 'Generating...' : 'Generate Summary'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 backdrop-blur-xl bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-xl border-2 border-amber-200 p-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Report Information</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Reports match the CSV structure with all columns and calculations</li>
                <li>• Data Sheet includes Table 1 (stoppages and time) data</li>
                <li>• Summary includes Table 2 (metrics and standards) data</li>
                <li>• All formulas from Excel are implemented (C=A-B, F=C/A, H=D/C, etc.)</li>
                <li>• Reports can be generated daily, weekly, or custom date range</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
