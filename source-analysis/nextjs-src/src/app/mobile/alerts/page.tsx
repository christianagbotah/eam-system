'use client'
import { useState } from 'react'

export default function AlertsPage() {
  const [alerts] = useState([
    { id: 1, asset: 'CNC-001', type: 'Vibration spike', severity: 'critical', time: '5 min ago' },
    { id: 2, asset: 'Press-003', type: 'Temperature high', severity: 'warning', time: '1 hour ago' },
    { id: 3, asset: 'Conveyor-A', type: 'Unusual noise', severity: 'info', time: '3 hours ago' }
  ])

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="text-lg font-bold">Active Alerts</h2>
        <p className="text-sm text-gray-600">{alerts.length} unacknowledged</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className={`rounded-lg shadow border-l-4 ${
            alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
            alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
            'bg-blue-50 border-blue-500'
          }`}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold">{alert.asset}</h3>
                  <p className="text-sm text-gray-700">{alert.type}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{alert.time}</p>
              <div className="flex gap-2">
                <button className="flex-1 bg-white border py-2 rounded text-sm">
                  Acknowledge
                </button>
                <button className="flex-1 bg-blue-600 text-white py-2 rounded text-sm">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
