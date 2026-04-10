'use client'
import { useState, useEffect } from 'react'
import PredictiveMaintenanceCard from '@/components/predictive/PredictiveMaintenanceCard'
import StatCard from '@/components/dashboard/StatCard'
import ChartCard from '@/components/dashboard/ChartCard'
import { predictiveService } from '@/services/predictive/predictiveService'
import { showToast } from '@/lib/toast'
import { CardSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function PredictivePage() {
  const [selectedAsset, setSelectedAsset] = useState('1')
  const [assetsAtRisk, setAssetsAtRisk] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const handleExport = () => {
    const csv = [Object.keys(assetsAtRisk[0] || {}).join(','), ...assetsAtRisk.map(a => Object.values(a).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `predictive-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Predictive data exported')
  }

  useKeyboardShortcuts({
    onExport: handleExport
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [riskData, anomalyData, metricsData] = await Promise.all([
        predictiveService.getAssetsAtRisk(),
        predictiveService.getAnomalies(),
        predictiveService.getModelMetrics()
      ])
      setAssetsAtRisk(riskData.data || [])
      setAnomalies(anomalyData.data || [])
      setMetrics(metricsData.data)
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <CardSkeleton count={8} />

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Predictive Maintenance</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard title="Assets at Risk" value={assetsAtRisk.length} icon="⚠️" color="red" />
        <StatCard title="Model Accuracy" value={`${metrics?.accuracy || 0}%`} icon="🎯" color="green" />
        <StatCard title="Anomalies Detected" value={anomalies.length} icon="🔍" color="yellow" />
        <StatCard title="Prevention Rate" value="94%" icon="✅" color="blue" trend={{ value: 5, isPositive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PredictiveMaintenanceCard assetId={selectedAsset} />

        <ChartCard title="High Risk Assets">
          <div className="space-y-3">
            {assetsAtRisk.map(asset => (
              <div 
                key={asset.id}
                onClick={() => setSelectedAsset(asset.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  selectedAsset === asset.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{asset.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    asset.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
                    asset.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {asset.risk_level?.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Failure Risk</span>
                      <span className="font-bold">{Math.round(asset.failure_probability)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          asset.risk_level === 'critical' ? 'bg-red-500' :
                          asset.risk_level === 'high' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${asset.failure_probability}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold">{asset.predicted_days}</div>
                    <div className="text-xs text-gray-500">days</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Anomaly Detection Timeline">
        <div className="space-y-2">
          {anomalies.slice(0, 10).map((item, i) => (
            <div key={i} className={`p-3 rounded-lg border-l-4 ${
              item.severity === 'critical' ? 'bg-red-50 border-red-500' :
              item.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
              'bg-blue-50 border-blue-500'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.asset_name}</div>
                  <div className="text-sm text-gray-600">{item.metric_type}: {item.value} (Threshold: {item.threshold})</div>
                </div>
                <span className="text-xs text-gray-500">{formatDateTime(item.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}
