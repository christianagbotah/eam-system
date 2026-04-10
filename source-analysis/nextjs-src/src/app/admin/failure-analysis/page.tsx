'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, DollarSign, Clock, BarChart3, Plus } from 'lucide-react';
import Link from 'next/link';

export default function FailureAnalysisPage() {
  const [stats, setStats] = useState({ total: 0, open: 0, downtime: 0, cost: 0 });
  const [reports, setReports] = useState([]);
  const [paretoData, setParetoData] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchReports();
    fetchPareto();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/eam/rca/statistics');
      const data = await response.json();
      setStats(data.summary || stats);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/v1/eam/rca');
      const data = await response.json();
      setReports(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPareto = async () => {
    try {
      const response = await fetch('/api/v1/eam/rca/pareto');
      const data = await response.json();
      setParetoData(data.data || []);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-base md:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            Failure Analysis & RCA
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Root cause analysis and corrective actions</p>
        </div>
        <Link
          href="/admin/failure-analysis/reports/create"
          className="mt-4 md:mt-0 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Failure Report
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Failures</p>
              <p className="text-base font-semibold text-gray-900">{stats.total}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Cases</p>
              <p className="text-base font-semibold text-gray-900">{stats.open}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Downtime</p>
              <p className="text-base font-semibold text-gray-900">{stats.downtime}h</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cost Impact</p>
              <p className="text-base font-semibold text-gray-900">${stats.cost.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Pareto Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Top 10 Failure Modes (Pareto Analysis)
        </h2>
        <div className="space-y-3">
          {paretoData.map((item: any, index: number) => {
            const maxFreq = paretoData[0]?.frequency || 1;
            const percentage = (item.frequency / maxFreq) * 100;
            return (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.failure_name}</span>
                  <span className="text-gray-600">{item.frequency} failures</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Failure Reports */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Failure Reports</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Report #</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Failure Mode</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Downtime</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.slice(0, 10).map((report: any) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{report.report_number}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{report.asset_name}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{report.failure_name}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {new Date(report.failure_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{report.downtime_hours}h</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/failure-analysis/reports/${report.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {reports.slice(0, 10).map((report: any) => (
            <div key={report.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{report.report_number}</p>
                  <p className="text-sm text-gray-600">{report.asset_name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{report.failure_name}</p>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{new Date(report.failure_date).toLocaleDateString()}</span>
                <span>{report.downtime_hours}h downtime</span>
              </div>
              <Link
                href={`/admin/failure-analysis/reports/${report.id}`}
                className="mt-3 block w-full text-center py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
