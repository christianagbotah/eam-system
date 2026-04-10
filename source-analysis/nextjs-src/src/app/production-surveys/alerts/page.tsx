'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function AlertsPage() {
  const [alerts] = useState<any[]>([]);

  const getSeverityBadge = (severity: string) => {
    const colors: any = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100';
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">🚨 Production Alerts</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Alerts</div>
            <div className="text-base font-semibold">{alerts.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Critical</div>
            <div className="text-base font-semibold text-red-600">
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Unacknowledged</div>
            <div className="text-base font-semibold text-orange-600">
              {alerts.filter(a => !a.acknowledged).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Today</div>
            <div className="text-base font-semibold text-blue-600">0</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Survey</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No alerts</td></tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-sm">{alert.created_at}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">{alert.alert_message}</td>
                    <td className="px-3 py-2.5 text-sm">{alert.survey_code}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {alert.acknowledged ? '✅ Ack' : '⏳ Pending'}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {!alert.acknowledged && (
                        <button className="text-blue-600 hover:text-blue-800">Acknowledge</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
