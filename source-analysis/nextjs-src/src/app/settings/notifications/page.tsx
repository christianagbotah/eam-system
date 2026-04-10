'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Bell, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NotificationsPage() {
  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    work_order_alerts: true,
    maintenance_reminders: true,
    inventory_alerts: true,
    safety_alerts: true
  });

  const handleSave = () => {
    toast.success('Notification settings saved');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600 mt-1">Configure notification preferences</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-4">Notification Channels</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.email_notifications} onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">Email Notifications</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.sms_notifications} onChange={(e) => setSettings({ ...settings, sms_notifications: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">SMS Notifications</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.push_notifications} onChange={(e) => setSettings({ ...settings, push_notifications: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">Push Notifications</label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4">Alert Types</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.work_order_alerts} onChange={(e) => setSettings({ ...settings, work_order_alerts: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">Work Order Alerts</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.maintenance_reminders} onChange={(e) => setSettings({ ...settings, maintenance_reminders: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">Maintenance Reminders</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.inventory_alerts} onChange={(e) => setSettings({ ...settings, inventory_alerts: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">Inventory Alerts</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={settings.safety_alerts} onChange={(e) => setSettings({ ...settings, safety_alerts: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label className="ml-2 text-sm font-medium text-gray-700">Safety Alerts</label>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
