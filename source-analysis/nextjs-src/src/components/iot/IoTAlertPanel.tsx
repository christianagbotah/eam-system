'use client'
import { useState, useEffect } from 'react'
import { iotService } from '@/services/iot/iotService'

interface Alert {
  id: string
  asset_id: string
  asset_name: string
  metric_type: string
  value: number
  threshold: number
  severity: 'warning' | 'critical'
  created_at: string
  acknowledged: boolean
}

export default function IoTAlertPanel({ assetId }: { assetId?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [assetId])

  const loadAlerts = async () => {
    try {
      const data = await iotService.getAlerts(assetId)
      setAlerts(data.data || [])
    } catch (error) {
      console.error('Failed to load alerts', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      await iotService.acknowledgeAlert(alertId)
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
    } catch (error) {
      console.error('Failed to acknowledge alert', error)
    }
  }

  if (loading) return <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />

  const activeAlerts = alerts.filter(a => !a.acknowledged)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">IoT Alerts</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          activeAlerts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {activeAlerts.length} Active
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activeAlerts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No active alerts</p>
        ) : (
          activeAlerts.map(alert => (
            <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
              alert.severity === 'critical' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{alert.asset_name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {alert.metric_type}: {alert.value.toFixed(2)} (Threshold: {alert.threshold})
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="ml-3 px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
