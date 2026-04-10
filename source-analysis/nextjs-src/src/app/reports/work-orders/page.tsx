'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function WorkOrderReportsPage() {
  const [activeReport, setActiveReport] = useState('performance');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [activeReport, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateRange.from,
        date_to: dateRange.to
      });
      
      const res = await api.get(`/work-order-reports/${activeReport}?${params}`);
      setReportData(res.data?.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    { id: 'performance', name: 'Performance', icon: '📊' },
    { id: 'labor-utilization', name: 'Labor', icon: '👷' },
    { id: 'cost-analysis', name: 'Cost', icon: '💰' },
    { id: 'mttr-mtbf', name: 'MTTR/MTBF', icon: '⚙️' },
    { id: 'aging', name: 'Aging', icon: '⏰' }
  ];

  return (
    <div className="p-6">
      <h1 className="text-base font-semibold mb-6">Work Order Reports</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`px-4 py-2 rounded-lg ${
                activeReport === report.id ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {report.icon} {report.name}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-xs font-medium mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-2.5 py-1.5 text-sm border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-2.5 py-1.5 text-sm border rounded"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : reportData ? (
        <div>
          {activeReport === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-lg font-semibold">{reportData.total_work_orders}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-lg font-semibold text-green-600">{reportData.completion_rate}%</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">On-Time</div>
                <div className="text-lg font-semibold text-blue-600">{reportData.on_time_rate}%</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Avg Time</div>
                <div className="text-lg font-semibold">{reportData.avg_completion_hours}h</div>
              </div>
            </div>
          )}

          {activeReport === 'labor-utilization' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Work Orders</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.technicians?.map((tech: any) => (
                    <tr key={tech.id}>
                      <td className="px-3 py-2.5 text-sm">{tech.full_name || tech.username}</td>
                      <td className="px-3 py-2.5 text-sm">{tech.trade}</td>
                      <td className="px-3 py-2.5 text-sm">{tech.work_orders_completed}</td>
                      <td className="px-3 py-2.5 text-sm">{tech.total_hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'cost-analysis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600">Labor Cost</div>
                  <div className="text-lg font-semibold">${reportData.total_labor_cost?.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600">Material Cost</div>
                  <div className="text-lg font-semibold">${reportData.total_material_cost?.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm text-gray-600">Total Cost</div>
                  <div className="text-lg font-semibold text-red-600">${reportData.total_cost?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'mttr-mtbf' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Failures</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">MTTR (hrs)</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">MTBF (days)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.assets?.map((asset: any) => (
                    <tr key={asset.asset_id}>
                      <td className="px-3 py-2.5 text-sm">{asset.asset_name}</td>
                      <td className="px-3 py-2.5 text-sm">{asset.failure_count}</td>
                      <td className="px-3 py-2.5 text-sm">{asset.mttr_hours?.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-sm">{asset.mtbf_days?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'aging' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Age (days)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.work_orders?.slice(0, 20).map((wo: any) => (
                    <tr key={wo.id}>
                      <td className="px-3 py-2.5 text-sm font-medium">{wo.wo_number}</td>
                      <td className="px-3 py-2.5 text-sm">{wo.title}</td>
                      <td className="px-3 py-2.5 text-sm">{wo.priority}</td>
                      <td className="px-3 py-2.5 text-sm font-bold">{wo.age_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
