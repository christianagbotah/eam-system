'use client';

import { useState } from 'react';
import { Activity, Thermometer, Droplet, Radio, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RBACGuard from '@/components/RBACGuard';

function ConditionMonitoringContent() {
  const [assets] = useState([
    { id: 1, name: 'Boiler #1', vibration: 4.2, temp: 85, oil: 'Good', status: 'normal', lastCheck: '2h ago' },
    { id: 2, name: 'Pump #3', vibration: 8.5, temp: 92, oil: 'Warning', status: 'warning', lastCheck: '1h ago' },
    { id: 3, name: 'Motor #5', vibration: 12.3, temp: 105, oil: 'Critical', status: 'critical', lastCheck: '30m ago' },
    { id: 4, name: 'Conveyor A', vibration: 3.8, temp: 78, oil: 'Good', status: 'normal', lastCheck: '3h ago' }
  ]);

  const vibrationData = [
    { time: '00:00', value: 4.2 },
    { time: '04:00', value: 4.5 },
    { time: '08:00', value: 5.1 },
    { time: '12:00', value: 6.8 },
    { time: '16:00', value: 8.2 },
    { time: '20:00', value: 8.5 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">Condition Monitoring</h1>
            <p className="text-gray-600">Predictive maintenance analytics</p>
          </div>
          <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />Add Reading
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Monitored Assets</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold">24</div>
            <div className="text-sm text-gray-600">Active sensors</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Critical Alerts</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-lg font-semibold text-red-600">3</div>
            <div className="text-sm text-red-600">Immediate action</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Warnings</span>
              <TrendingUp className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="text-lg font-semibold text-yellow-600">7</div>
            <div className="text-sm text-yellow-600">Monitor closely</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Normal</span>
              <Radio className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-semibold text-green-600">14</div>
            <div className="text-sm text-green-600">Operating well</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Vibration Trend - Pump #3</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={vibrationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-red-600">Vibration exceeding threshold (8.0 mm/s)</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Monitoring Methods</h2>
            <div className="space-y-4">
              {[
                { name: 'Vibration Analysis', count: 24, icon: Activity, color: 'blue' },
                { name: 'Temperature', count: 24, icon: Thermometer, color: 'red' },
                { name: 'Oil Analysis', count: 18, icon: Droplet, color: 'yellow' },
                { name: 'Ultrasonic', count: 12, icon: Radio, color: 'purple' }
              ].map((method, i) => {
                const Icon = method.icon;
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 text-${method.color}-600`} />
                      <span className="font-medium">{method.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{method.count} assets</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Asset Condition Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Vibration (mm/s)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Temperature (°C)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Oil Condition</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Last Check</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{asset.name}</td>
                    <td className="px-4 py-3">
                      <span className={asset.vibration > 8 ? 'text-red-600 font-medium' : asset.vibration > 6 ? 'text-yellow-600' : ''}>
                        {asset.vibration}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={asset.temp > 100 ? 'text-red-600 font-medium' : asset.temp > 90 ? 'text-yellow-600' : ''}>
                        {asset.temp}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${asset.oil === 'Critical' ? 'bg-red-100 text-red-800' : asset.oil === 'Warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {asset.oil}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(asset.status)}`}>
                        {asset.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{asset.lastCheck}</td>
                    <td className="px-4 py-3">
                      <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function ConditionMonitoringPage() {
  return (
    <RBACGuard module="condition_monitoring" action="view">
      <ConditionMonitoringContent />
    </RBACGuard>
  );
}
