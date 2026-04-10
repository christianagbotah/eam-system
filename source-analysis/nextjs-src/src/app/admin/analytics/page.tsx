'use client'
import { useState, useEffect } from 'react'
import KPICard from '@/components/analytics/KPICard'
import ChartCard from '@/components/dashboard/ChartCard'
import { analyticsService } from '@/services/analytics/analyticsService'
import { showToast } from '@/lib/toast'
import { CardSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'
import RBACGuard from '@/components/RBACGuard'

function AnalyticsContent() {
  const [kpis, setKpis] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(departments)

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? departments.filter(d => selectedIds.includes(d.department)) : departments
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(d => Object.values(d).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Analytics data exported successfully')
  }

  useKeyboardShortcuts({
    onExport: handleExport
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [kpiData, deptData] = await Promise.all([
        analyticsService.getKPIs(),
        analyticsService.getDepartmentMetrics()
      ])
      setKpis(kpiData.data)
      setDepartments(deptData.data || [])
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <CardSkeleton count={8} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
        <select className="border rounded px-4 py-2">
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total Assets" value={kpis?.total_assets || 0} icon="🏭" color="blue" />
        <KPICard title="Maintenance Cost" value={kpis?.total_cost || 0} format="currency" icon="💰" color="red" trend={-5} />
        <KPICard title="Asset Availability" value={kpis?.availability || 0} format="percent" icon="✅" color="green" trend={3} />
        <KPICard title="MTBF" value={kpis?.mtbf || 0} format="hours" icon="⏱️" color="purple" trend={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Maintenance Cost Trend">
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart visualization (integrate Chart.js or Recharts)
          </div>
        </ChartCard>

        <ChartCard title="Work Order Distribution">
          <div className="space-y-3">
            {[
              { type: 'Preventive', count: 45, color: 'bg-blue-500' },
              { type: 'Corrective', count: 32, color: 'bg-red-500' },
              { type: 'Inspection', count: 18, color: 'bg-green-500' }
            ].map(item => (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.type}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.count / 95) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Department Performance">
        <BulkActions
          selectedIds={selectedIds}
          totalCount={departments.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkExport={handleExport}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input type="checkbox" checked={selectedIds.length === departments.length && departments.length > 0} onChange={selectAll} className="rounded" />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assets</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Work Orders</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map((dept, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={isSelected(dept.department)} onChange={() => toggleSelect(dept.department)} className="rounded" />
                  </td>
                  <td className="px-6 py-4 font-medium">{dept.department}</td>
                  <td className="px-6 py-4">{dept.total_assets}</td>
                  <td className="px-6 py-4">{dept.total_work_orders}</td>
                  <td className="px-6 py-4">${Number(dept.total_cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      dept.availability > 90 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {dept.availability?.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <RBACGuard module="analytics" action="view">
      <AnalyticsContent />
    </RBACGuard>
  )
}
