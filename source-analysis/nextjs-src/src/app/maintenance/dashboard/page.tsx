'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import KPIStatCard from '@/components/dashboard/KPIStatCard';
import FilterBar from '@/components/dashboard/FilterBar';
import DonutChart from '@/components/dashboard/Charts/DonutChart';
import LineChart from '@/components/dashboard/Charts/LineChart';
import GaugeChart from '@/components/dashboard/Charts/GaugeChart';

export default function MaintenanceDashboardPage() {
  const router = useRouter();
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [workOrdersRes, assetsRes] = await Promise.all([
        api.get('/work-orders?limit=10'),
        api.get('/assets-unified')
      ]);

      const woList = workOrdersRes.data?.data || [];
      const assets = assetsRes.data?.data || [];

      setDashboardData({
        kpis: {
          totalAssets: assets.length || 0,
          activeMachines: assets.filter((a: any) => a.status === 'active').length || 0,
          openWorkOrders: woList.filter((w: any) => ['open', 'in_progress', 'pending'].includes(w.status)).length || 0,
          pmOverdue: 0,
          techniciansOnline: 0,
          pendingApprovals: 0
        },
        woTrend: [],
        pmCompliance: [],
        assetStatus: []
      });
      setWorkOrders(woList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Maintenance Dashboard</h1>
          <p className="text-xs text-gray-600 mt-0.5">Complete system overview and analytics</p>
        </div>
        <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Export Report
        </button>
      </div>

      <FilterBar />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        <KPIStatCard title="Total Assets" value={dashboardData.kpis.totalAssets} icon="🏭" color="blue" />
        <KPIStatCard title="Active Machines" value={dashboardData.kpis.activeMachines} icon="⚙️" color="green" subtitle={`${dashboardData.kpis.totalAssets > 0 ? Math.round((dashboardData.kpis.activeMachines / dashboardData.kpis.totalAssets) * 100) : 0}% uptime`} />
        <KPIStatCard title="Open Work Orders" value={dashboardData.kpis.openWorkOrders} icon="🔧" color="yellow" />
        <KPIStatCard title="PM Overdue" value={dashboardData.kpis.pmOverdue} icon="⚠️" color="red" subtitle="Requires attention" />
        <KPIStatCard title="Technicians Online" value={dashboardData.kpis.techniciansOnline} icon="👷" color="purple" subtitle="Available now" />
        <KPIStatCard title="Pending Approvals" value={dashboardData.kpis.pendingApprovals} icon="✓" color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LineChart title="Work Orders Trend (Last 7 Days)" data={dashboardData.woTrend.length > 0 ? dashboardData.woTrend : [{ name: 'No data', completed: 0, open: 0, overdue: 0 }]} dataKeys={[{ key: 'completed', color: '#10b981', name: 'Completed' }, { key: 'open', color: '#3b82f6', name: 'Open' }, { key: 'overdue', color: '#ef4444', name: 'Overdue' }]} />
        <DonutChart title="PM Compliance Status" data={dashboardData.pmCompliance.length > 0 ? dashboardData.pmCompliance : [{ name: 'No data', value: 1 }]} colors={['#10b981', '#ef4444', '#f59e0b']} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <DonutChart title="Asset Status Distribution" data={dashboardData.assetStatus.length > 0 ? dashboardData.assetStatus : [{ name: 'No data', value: 1 }]} colors={['#10b981', '#6b7280', '#f59e0b', '#ef4444']} />
        <GaugeChart title="Overall Equipment Effectiveness" value={87} max={100} unit="%" color="#10b981" />
        <GaugeChart title="Maintenance Efficiency" value={92} max={100} unit="%" color="#3b82f6" />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Work Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workOrders.length > 0 ? workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    <button onClick={() => setSelectedWO(wo)} className="text-blue-600 hover:text-blue-800 hover:underline">
                      {wo.work_order_number || wo.id}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{wo.asset_name || wo.asset || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{wo.work_order_type || wo.type || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${wo.priority === 'critical' || wo.priority === 'Critical' ? 'bg-red-100 text-red-800' : wo.priority === 'high' || wo.priority === 'High' ? 'bg-orange-100 text-orange-800' : wo.priority === 'medium' || wo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {wo.priority || 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${wo.status === 'completed' || wo.status === 'Completed' ? 'bg-green-100 text-green-800' : wo.status === 'in_progress' || wo.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : wo.status === 'open' || wo.status === 'Open' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {wo.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{wo.assigned_to_name || wo.tech || 'Unassigned'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No work orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedWO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selectedWO.work_order_number || selectedWO.id}</h2>
                  <p className="text-xs text-gray-600 mt-0.5">{selectedWO.asset_name || selectedWO.asset}</p>
                </div>
                <button onClick={() => setSelectedWO(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <p className="text-gray-900">{selectedWO.work_order_type || selectedWO.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <p><span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedWO.priority === 'critical' || selectedWO.priority === 'Critical' ? 'bg-red-100 text-red-800' : selectedWO.priority === 'high' || selectedWO.priority === 'High' ? 'bg-orange-100 text-orange-800' : selectedWO.priority === 'medium' || selectedWO.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{selectedWO.priority}</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p><span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedWO.status === 'completed' || selectedWO.status === 'Completed' ? 'bg-green-100 text-green-800' : selectedWO.status === 'in_progress' || selectedWO.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : selectedWO.status === 'open' || selectedWO.status === 'Open' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{selectedWO.status}</span></p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Assigned To</label>
                    <p className="text-gray-900">{selectedWO.assigned_to_name || selectedWO.tech}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{selectedWO.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created Date</label>
                    <p className="text-gray-900">{selectedWO.created_at || selectedWO.createdDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Due Date</label>
                    <p className="text-gray-900">{selectedWO.due_date || selectedWO.dueDate}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={() => setSelectedWO(null)} className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Close</button>
                  <button onClick={() => router.push(`/maintenance/work-orders/${selectedWO.id}`)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700">View Full Details</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
