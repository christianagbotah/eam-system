'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function MobileDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ tasks: 0, alerts: 0, assets: 0 })

  useEffect(() => {
    setStats({ tasks: 5, alerts: 3, assets: 12 })
  }, [])

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="text-lg font-bold mb-2">Welcome, {user?.full_name || user?.username}</h2>
        <p className="text-sm text-gray-600">Role: {user?.role}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-500 text-white rounded-lg p-4 text-center">
          <div className="text-lg font-semibold">{stats.tasks}</div>
          <div className="text-xs mt-1">My Tasks</div>
        </div>
        <div className="bg-red-500 text-white rounded-lg p-4 text-center">
          <div className="text-lg font-semibold">{stats.alerts}</div>
          <div className="text-xs mt-1">Alerts</div>
        </div>
        <div className="bg-green-500 text-white rounded-lg p-4 text-center">
          <div className="text-lg font-semibold">{stats.assets}</div>
          <div className="text-xs mt-1">Assets</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold">Quick Actions</h3>
        </div>
        <div className="p-2 space-y-2">
          <button className="w-full bg-blue-50 p-3 rounded-lg text-left flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <div>
              <div className="font-medium">Scan Asset QR</div>
              <div className="text-xs text-gray-600">Quick asset lookup</div>
            </div>
          </button>
          <button className="w-full bg-green-50 p-3 rounded-lg text-left flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-medium">Complete Task</div>
              <div className="text-xs text-gray-600">Update work order</div>
            </div>
          </button>
          <button className="w-full bg-yellow-50 p-3 rounded-lg text-left flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <div className="font-medium">Report Issue</div>
              <div className="text-xs text-gray-600">Create new work order</div>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold">Recent Activity</h3>
        </div>
        <div className="divide-y">
          {[
            { icon: '✅', text: 'Completed WO-2024-045', time: '10 min ago' },
            { icon: '🔧', text: 'Started maintenance on CNC-001', time: '1 hour ago' },
            { icon: '📋', text: 'Submitted production survey', time: '2 hours ago' }
          ].map((item, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.text}</div>
                <div className="text-xs text-gray-500">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
