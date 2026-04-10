'use client'
import { useState, useEffect } from 'react'
import { erpService } from '@/services/erp/erpService'
import StatCard from '@/components/dashboard/StatCard'
import ChartCard from '@/components/dashboard/ChartCard'
import { showToast } from '@/lib/toast'
import { CardSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function ERPIntegrationPage() {
  const [status, setStatus] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  const handleExport = () => {
    const csv = [Object.keys(history[0] || {}).join(','), ...history.map(h => Object.values(h).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `erp-sync-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Sync history exported')
  }

  useKeyboardShortcuts({ onExport: handleExport })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statusData, historyData] = await Promise.all([
        erpService.getSyncStatus(),
        erpService.getSyncHistory(20)
      ])
      setStatus(statusData.data)
      setHistory(historyData.data || [])
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (type: string) => {
    setSyncing(type)
    const loadingToast = showToast.loading(`Syncing ${type}...`)
    try {
      if (type === 'assets') await erpService.syncAssets()
      if (type === 'work-orders') await erpService.syncWorkOrders()
      if (type === 'inventory') await erpService.syncInventory()
      showToast.dismiss(loadingToast)
      showToast.success(`${type} synced successfully`)
      await loadData()
    } catch (error) {
      showToast.dismiss(loadingToast)
      showToast.error('Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  if (loading) return <CardSkeleton count={6} />

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">ERP Integration</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard title="Last Sync" value={status?.last_sync ? formatDateTime(status.last_sync) : 'Never'} icon="🔄" color="blue" />
        <StatCard title="Success Rate" value={status?.success_rate || 0} format="percent" icon="✅" color="green" />
        <StatCard title="Failed Syncs" value={status?.failed_count || 0} icon="❌" color="red" />
      </div>

      <ChartCard title="Sync Operations">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            onClick={() => handleSync('assets')}
            disabled={syncing !== null}
            className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
          >
            <div className="text-3xl mb-2">🏭</div>
            <div className="font-bold">Sync Assets</div>
            <div className="text-sm opacity-90 mt-1">From ERP to EAM</div>
            {syncing === 'assets' && <div className="text-xs mt-2">Syncing...</div>}
          </button>

          <button
            onClick={() => handleSync('work-orders')}
            disabled={syncing !== null}
            className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50"
          >
            <div className="text-3xl mb-2">🔧</div>
            <div className="font-bold">Sync Work Orders</div>
            <div className="text-sm opacity-90 mt-1">Bidirectional</div>
            {syncing === 'work-orders' && <div className="text-xs mt-2">Syncing...</div>}
          </button>

          <button
            onClick={() => handleSync('inventory')}
            disabled={syncing !== null}
            className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50"
          >
            <div className="text-3xl mb-2">📦</div>
            <div className="font-bold">Sync Inventory</div>
            <div className="text-sm opacity-90 mt-1">Bidirectional</div>
            {syncing === 'inventory' && <div className="text-xs mt-2">Syncing...</div>}
          </button>
        </div>
      </ChartCard>

      <ChartCard title="Sync History">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 text-sm">{formatDateTime(item.created_at)}</td>
                  <td className="px-3 py-2.5 text-sm font-medium">{item.entity_type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'success' ? 'bg-green-100 text-green-700' : 
                      item.status === 'failed' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
