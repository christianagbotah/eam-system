'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function AlertRulesPage() {
  const [rules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-base font-semibold">⚙️ Alert Rules Configuration</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Rule
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create Alert Rule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-2">Rule Name</label>
                <input type="text" className="w-full border rounded px-3 py-2" placeholder="High Defects Alert" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alert Type</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="defects">Defects</option>
                  <option value="downtime">Downtime</option>
                  <option value="production">Production</option>
                  <option value="quality">Quality</option>
                  <option value="safety">Safety</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Threshold Value</label>
                <input type="number" className="w-full border rounded px-3 py-2" placeholder="10" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comparison</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="equals">Equals</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notification Method</label>
                <select className="w-full border rounded px-3 py-2">
                  <option value="system">System Only</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="all">All Methods</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Rule</button>
              <button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rule Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notification</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No rules configured</td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-6 py-4">{rule.rule_name}</td>
                    <td className="px-6 py-4">{rule.alert_type}</td>
                    <td className="px-6 py-4">{rule.threshold_value}</td>
                    <td className="px-6 py-4">{rule.notification_method}</td>
                    <td className="px-6 py-4">{rule.active ? '✅' : '❌'}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                      <button className="text-red-600 hover:text-red-800">Delete</button>
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
