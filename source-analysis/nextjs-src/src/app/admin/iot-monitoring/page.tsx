'use client'
import { useState } from 'react'
import RealTimeChart from '@/components/iot/RealTimeChart'
import IoTAlertPanel from '@/components/iot/IoTAlertPanel'
import StatCard from '@/components/dashboard/StatCard'
import { showToast } from '@/lib/toast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import RBACGuard from '@/components/RBACGuard'

function IoTMonitoringContent() {
  const [selectedAsset, setSelectedAsset] = useState('1')

  const handleExport = () => {
    showToast.success('IoT data exported successfully')
  }

  useKeyboardShortcuts({
    onExport: handleExport
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">IoT Monitoring</h1>
        <select 
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="border rounded px-4 py-2"
        >
          <option value="1">CNC Machine - 001</option>
          <option value="2">Hydraulic Press - 003</option>
          <option value="3">Conveyor Belt - A</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard title="Connected Devices" value="24" icon="📡" color="blue" />
        <StatCard title="Active Alerts" value="3" icon="⚠️" color="red" />
        <StatCard title="Data Points/sec" value="1,245" icon="📊" color="green" />
        <StatCard title="System Health" value="98%" icon="💚" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RealTimeChart 
          assetId={selectedAsset}
          metricType="vibration"
          title="Vibration Level"
          unit="mm/s"
          threshold={8.0}
        />
        <RealTimeChart 
          assetId={selectedAsset}
          metricType="temperature"
          title="Temperature"
          unit="°C"
          threshold={85}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RealTimeChart 
          assetId={selectedAsset}
          metricType="pressure"
          title="Pressure"
          unit="bar"
          threshold={150}
        />
        <RealTimeChart 
          assetId={selectedAsset}
          metricType="rpm"
          title="RPM"
          unit="rpm"
        />
      </div>

      <IoTAlertPanel assetId={selectedAsset} />
    </div>
  )
}

export default function IoTMonitoringPage() {
  return (
    <RBACGuard module="iot_monitoring" action="view">
      <IoTMonitoringContent />
    </RBACGuard>
  )
}
