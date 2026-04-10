'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [settings, setSettings] = useState<any>({});

  const handleExport = () => {
    showToast.success('System settings exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/system');
      const result = response.data;
      if (result.status === 'success') {
        const data = result.data;
        setSettings({
          timezone: data.general?.timezone || 'UTC',
          date_format: data.general?.date_format || 'YYYY-MM-DD',
          time_format: data.general?.time_format || '24h',
          language: data.general?.language || 'en',
          currency: data.regional?.currency || 'USD',
          currency_symbol: data.regional?.currency_symbol || '$',
          decimal_separator: data.regional?.decimal_separator || '.',
          thousand_separator: data.regional?.thousand_separator || ',',
          length_unit: data.units?.length_unit || 'meters',
          weight_unit: data.units?.weight_unit || 'kg',
          temperature_unit: data.units?.temperature_unit || 'celsius',
          pressure_unit: data.units?.pressure_unit || 'bar',
          volume_unit: data.units?.volume_unit || 'liters',
          production_unit: data.production?.production_unit || 'units',
          shift_duration: parseInt(data.production?.shift_duration) || 8,
          working_days: data.production?.working_days || 'monday,tuesday,wednesday,thursday,friday',
          pm_lead_time: parseInt(data.maintenance?.pm_lead_time) || 7,
          wo_auto_number: data.maintenance?.wo_auto_number === 'true',
          wo_prefix: data.maintenance?.wo_prefix || 'WO',
          default_priority: data.maintenance?.wo_default_priority || 'medium',
          email_notifications: data.notifications?.email_notifications === 'true',
          sms_notifications: data.notifications?.sms_notifications === 'true',
          push_notifications: data.notifications?.push_notifications === 'true',
          alert_threshold: parseInt(data.notifications?.alert_threshold) || 80,
          session_timeout: parseInt(data.security?.session_timeout) || 30,
          password_expiry: parseInt(data.security?.password_expiry) || 90,
          two_factor_auth: data.security?.two_factor_auth === 'true',
          login_attempts: parseInt(data.security?.max_login_attempts) || 5,
          auto_backup: data.backup?.auto_backup === 'true',
          backup_frequency: data.backup?.backup_frequency || 'daily',
          backup_retention: parseInt(data.backup?.backup_retention) || 30
        });
      }
    } catch (error) {
      showToast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    if (showModal && modalType === 'success') {
      const timer = setTimeout(() => closeModal(), 3000);
      return () => clearTimeout(timer);
    }
  }, [showModal, modalType]);

  const handleSave = async () => {
    try {
      const payload = {
        general: {
          system_name: 'iFactory EAM System',
          timezone: settings.timezone,
          date_format: settings.date_format,
          time_format: settings.time_format,
          language: settings.language
        },
        regional: {
          currency: settings.currency,
          currency_symbol: settings.currency_symbol,
          decimal_separator: settings.decimal_separator,
          thousand_separator: settings.thousand_separator
        },
        units: {
          length_unit: settings.length_unit,
          weight_unit: settings.weight_unit,
          temperature_unit: settings.temperature_unit,
          pressure_unit: settings.pressure_unit,
          volume_unit: settings.volume_unit
        },
        production: {
          production_unit: settings.production_unit,
          shift_duration: settings.shift_duration.toString(),
          working_days: settings.working_days
        },
        maintenance: {
          pm_lead_time: settings.pm_lead_time.toString(),
          wo_auto_number: settings.wo_auto_number.toString(),
          wo_prefix: settings.wo_prefix,
          wo_default_priority: settings.default_priority
        },
        notifications: {
          email_notifications: settings.email_notifications.toString(),
          sms_notifications: settings.sms_notifications.toString(),
          push_notifications: settings.push_notifications.toString(),
          alert_threshold: settings.alert_threshold.toString()
        },
        security: {
          session_timeout: settings.session_timeout.toString(),
          password_expiry: settings.password_expiry.toString(),
          max_login_attempts: settings.login_attempts.toString(),
          two_factor_auth: settings.two_factor_auth.toString()
        },
        backup: {
          auto_backup: settings.auto_backup.toString(),
          backup_frequency: settings.backup_frequency,
          backup_retention: settings.backup_retention.toString()
        }
      };
      const response = await api.put('/settings/system', payload);
      const result = response.data;
      if (result.status === 'success') {
        setModalType('success');
        setModalMessage('Settings saved successfully!');
      } else {
        setModalType('error');
        setModalMessage('Failed to save settings');
      }
    } catch (error) {
      setModalType('error');
      setModalMessage('Error saving settings');
    }
    setShowModal(true);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'regional', label: 'Regional', icon: '🌍' },
    { id: 'units', label: 'Units', icon: '📏' },
    { id: 'production', label: 'Production', icon: '🏭' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'backup', label: 'Backup', icon: '💾' }
  ];

  if (loading) return <CardSkeleton count={8} />;

  return (
    <>
      <div className="p-4 space-y-4">
        <h1 className="text-lg font-semibold text-gray-800">System Settings</h1>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b overflow-x-auto">
            <div className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-semibold text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                    <input
                      type="text"
                      value="iFactory EAM System"
                      disabled
                      className="w-full px-2 py-1 text-xs border rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={settings.date_format}
                      onChange={(e) => setSettings({...settings, date_format: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                    <select
                      value={settings.time_format}
                      onChange={(e) => setSettings({...settings, time_format: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour (AM/PM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({...settings, language: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Regional Settings */}
            {activeTab === 'regional' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => setSettings({...settings, currency: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                      <option value="GHS">GHS - Ghana Cedis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
                    <select
                      value={settings.currency_symbol}
                      onChange={(e) => setSettings({...settings, currency_symbol: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="$">$ - Dollar</option>
                      <option value="€">€ - Euro</option>
                      <option value="£">£ - Pound</option>
                      <option value="¥">¥ - Yen/Yuan</option>
                      <option value="₵">₵ - Ghana Cedis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decimal Separator</label>
                    <select
                      value={settings.decimal_separator}
                      onChange={(e) => setSettings({...settings, decimal_separator: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value=".">. (Period)</option>
                      <option value=",">, (Comma)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thousand Separator</label>
                    <select
                      value={settings.thousand_separator}
                      onChange={(e) => setSettings({...settings, thousand_separator: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value=",">, (Comma)</option>
                      <option value=".">. (Period)</option>
                      <option value=" ">Space</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Units Settings */}
            {activeTab === 'units' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Length Unit</label>
                    <select
                      value={settings.length_unit}
                      onChange={(e) => setSettings({...settings, length_unit: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="meters">Meters (m)</option>
                      <option value="feet">Feet (ft)</option>
                      <option value="inches">Inches (in)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight Unit</label>
                    <select
                      value={settings.weight_unit}
                      onChange={(e) => setSettings({...settings, weight_unit: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="lbs">Pounds (lbs)</option>
                      <option value="tons">Tons</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Unit</label>
                    <select
                      value={settings.temperature_unit}
                      onChange={(e) => setSettings({...settings, temperature_unit: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="celsius">Celsius (°C)</option>
                      <option value="fahrenheit">Fahrenheit (°F)</option>
                      <option value="kelvin">Kelvin (K)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pressure Unit</label>
                    <select
                      value={settings.pressure_unit}
                      onChange={(e) => setSettings({...settings, pressure_unit: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bar">Bar</option>
                      <option value="psi">PSI</option>
                      <option value="pa">Pascal (Pa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Volume Unit</label>
                    <select
                      value={settings.volume_unit}
                      onChange={(e) => setSettings({...settings, volume_unit: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="liters">Liters (L)</option>
                      <option value="gallons">Gallons (gal)</option>
                      <option value="cubic_meters">Cubic Meters (m³)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Production Settings */}
            {activeTab === 'production' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Production Unit</label>
                    <input
                      type="text"
                      value={settings.production_unit}
                      onChange={(e) => setSettings({...settings, production_unit: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., units, pieces, yards"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Duration (hours)</label>
                    <input
                      type="number"
                      value={settings.shift_duration}
                      onChange={(e) => setSettings({...settings, shift_duration: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                    <select
                      value={settings.working_days}
                      onChange={(e) => setSettings({...settings, working_days: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mon-fri">Monday - Friday</option>
                      <option value="mon-sat">Monday - Saturday</option>
                      <option value="all">All Days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Maintenance Settings */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PM Lead Time (days)</label>
                    <input
                      type="number"
                      value={settings.pm_lead_time}
                      onChange={(e) => setSettings({...settings, pm_lead_time: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Order Prefix</label>
                    <input
                      type="text"
                      value={settings.wo_prefix}
                      onChange={(e) => setSettings({...settings, wo_prefix: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Priority</label>
                    <select
                      value={settings.default_priority}
                      onChange={(e) => setSettings({...settings, default_priority: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.wo_auto_number}
                      onChange={(e) => setSettings({...settings, wo_auto_number: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Auto-generate Work Order Numbers</label>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Email Notifications</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.sms_notifications}
                      onChange={(e) => setSettings({...settings, sms_notifications: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">SMS Notifications</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.push_notifications}
                      onChange={(e) => setSettings({...settings, push_notifications: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Push Notifications</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alert Threshold (%)</label>
                    <input
                      type="number"
                      value={settings.alert_threshold}
                      onChange={(e) => setSettings({...settings, alert_threshold: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.session_timeout}
                      onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                    <input
                      type="number"
                      value={settings.password_expiry}
                      onChange={(e) => setSettings({...settings, password_expiry: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                    <input
                      type="number"
                      value={settings.login_attempts}
                      onChange={(e) => setSettings({...settings, login_attempts: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.two_factor_auth}
                      onChange={(e) => setSettings({...settings, two_factor_auth: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Enable Two-Factor Authentication</label>
                  </div>
                </div>
              </div>
            )}

            {/* Backup Settings */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.auto_backup}
                      onChange={(e) => setSettings({...settings, auto_backup: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Enable Automatic Backup</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                    <select
                      value={settings.backup_frequency}
                      onChange={(e) => setSettings({...settings, backup_frequency: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backup Retention (days)</label>
                    <input
                      type="number"
                      value={settings.backup_retention}
                      onChange={(e) => setSettings({...settings, backup_retention: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                    Backup Now
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-6 bg-gray-50 flex justify-end gap-2">
            <button onClick={fetchSettings} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-semibold">
              Reset to Default
            </button>
            <button onClick={handleSave} className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
          <div className={`bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center ${isClosing ? 'animate-drop-down' : 'animate-scale-in'}`}>
            <div className="flex justify-center mb-6">
              {modalType === 'success' ? (
                <div className="relative">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {modalType === 'success' ? 'Success!' : 'Error!'}
            </h3>
            <p className="text-gray-600 mb-6">{modalMessage}</p>
            <button
              onClick={closeModal}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
