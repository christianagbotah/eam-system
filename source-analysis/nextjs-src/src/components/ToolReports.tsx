'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ToolReports({ plantId }: { plantId: number }) {
  const [activeReport, setActiveReport] = useState('utilization');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const [reports, setReports] = useState({
    utilization: [],
    overdue: [],
    damage: [],
    lifecycle: [],
    calibration: null
  });

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport, dateRange]);

  const loadReport = async (reportType: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = 'http://localhost/factorymanager/public/index.php/api/v1/eam/tool-reports';
      
      let url = '';
      switch (reportType) {
        case 'utilization':
          url = `${baseUrl}/utilization?plant_id=${plantId}&start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`;
          break;
        case 'overdue':
          url = `${baseUrl}/overdue-returns?plant_id=${plantId}`;
          break;
        case 'damage':
          url = `${baseUrl}/damage-report?plant_id=${plantId}&start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`;
          break;
        case 'lifecycle':
          url = `${baseUrl}/lifecycle-cost?plant_id=${plantId}`;
          break;
        case 'calibration':
          url = `${baseUrl}/calibration-compliance?plant_id=${plantId}`;
          break;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReports(prev => ({
        ...prev,
        [reportType]: response.data.data
      }));
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">🛠️ Tool Management Reports</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'utilization', label: '📊 Utilization', icon: '📊' },
          { id: 'overdue', label: '⏰ Overdue', icon: '⏰' },
          { id: 'damage', label: '🔨 Damage', icon: '🔨' },
          { id: 'lifecycle', label: '💰 Lifecycle', icon: '💰' },
          { id: 'calibration', label: '🎯 Calibration', icon: '🎯' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
              activeReport === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report...</p>
          </div>
        ) : (
          <>
            {/* Utilization Report */}
            {activeReport === 'utilization' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Tool Utilization Report</h2>
                  <button
                    onClick={() => exportToCSV(reports.utilization, 'tool_utilization')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                  >
                    📥 Export CSV
                  </button>
                </div>
                
                {reports.utilization.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reports.utilization}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tool_code" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="usage_count" fill="#3B82F6" name="Usage Count" />
                        <Bar dataKey="total_hours" fill="#10B981" name="Total Hours" />
                      </BarChart>
                    </ResponsiveContainer>

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reports.utilization.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tool_code}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.tool_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.usage_count}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.total_hours || 0} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="text-center text-gray-500 py-8">No utilization data available</p>
                )}
              </div>
            )}

            {/* Overdue Returns Report */}
            {activeReport === 'overdue' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Overdue Tool Returns</h2>
                  <button
                    onClick={() => exportToCSV(reports.overdue, 'overdue_returns')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {reports.overdue.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">WO Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Tool</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Technician</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Expected Return</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.overdue.map((item: any, idx: number) => {
                        const daysOverdue = Math.floor((new Date().getTime() - new Date(item.expected_return_date).getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={idx} className="bg-red-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.wo_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.tool_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.requested_by_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{new Date(item.expected_return_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600">{daysOverdue} days</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-green-600 font-semibold text-lg">✅ No overdue tools!</p>
                    <p className="text-gray-500 text-sm mt-2">All tools returned on time</p>
                  </div>
                )}
              </div>
            )}

            {/* Damage Report */}
            {activeReport === 'damage' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Tool Damage Report</h2>
                  <button
                    onClick={() => exportToCSV(reports.damage, 'tool_damage')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {reports.damage.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600 font-semibold">Total Damaged Tools</p>
                      <p className="text-3xl font-bold text-red-700">{reports.damage.length}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-600 font-semibold">Total Penalty Cost</p>
                      <p className="text-3xl font-bold text-orange-700">
                        ${reports.damage.reduce((sum: number, item: any) => sum + parseFloat(item.penalty_cost || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {reports.damage.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Damage Notes</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penalty</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.damage.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tool_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.issued_to_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{new Date(item.return_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.damage_notes}</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-600">${parseFloat(item.penalty_cost || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-green-600 font-semibold text-lg">✅ No damaged tools!</p>
                    <p className="text-gray-500 text-sm mt-2">All tools returned in good condition</p>
                  </div>
                )}
              </div>
            )}

            {/* Calibration Compliance */}
            {activeReport === 'calibration' && reports.calibration && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Calibration Compliance Report</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-semibold">Total Calibrated Tools</p>
                    <p className="text-3xl font-bold text-blue-700">{reports.calibration.total_calibrated_tools}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 font-semibold">Overdue Calibrations</p>
                    <p className="text-3xl font-bold text-red-700">{reports.calibration.overdue_count}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-semibold">Compliance Rate</p>
                    <p className="text-3xl font-bold text-green-700">{reports.calibration.compliance_percentage}%</p>
                  </div>
                </div>

                {reports.calibration.upcoming_30_days?.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3">Upcoming Calibrations (Next 30 Days)</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-yellow-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Tool Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Tool Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Due Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-yellow-700 uppercase">Days Until Due</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reports.calibration.upcoming_30_days.map((item: any, idx: number) => {
                          const daysUntil = Math.ceil((new Date(item.calibration_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tool_code}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.tool_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{new Date(item.calibration_due_date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-sm font-bold text-yellow-600">{daysUntil} days</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
