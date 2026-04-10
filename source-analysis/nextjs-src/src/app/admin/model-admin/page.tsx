'use client';

import { useState, useEffect } from 'react';
import { Settings, Database, Activity, Users, Shield } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function ModelAdminPanel() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    max_file_size: 50,
    allowed_formats: ['glb', 'gltf', 'obj', 'fbx', 'stl'],
    auto_thumbnail: true,
    enable_versioning: false
  });
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    showToast.success('Model admin data exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    loadStats();
    loadActivities();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/v1/eam/models/analytics/stats');
      setStats(await res.json());
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    const res = await fetch('/api/v1/eam/models/analytics/recent-activity');
    setActivities(await res.json());
  };

  const saveSettings = async () => {
    const loadingToast = showToast.loading('Saving settings...');
    try {
      await fetch('/api/v1/eam/models/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      showToast.dismiss(loadingToast);
      showToast.success('Settings saved successfully');
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to save settings');
    }
  };

  if (loading) return <CardSkeleton count={8} />;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-base font-semibold">Model Administration</h1>

      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white p-6 rounded-lg shadow">
          <Database className="text-blue-600 mb-2" size={24} />
          <div className="text-lg font-semibold">{stats?.total_models || 0}</div>
          <div className="text-sm text-gray-600">Total Models</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <Activity className="text-green-600 mb-2" size={24} />
          <div className="text-lg font-semibold">{stats?.active_models || 0}</div>
          <div className="text-sm text-gray-600">Active Models</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <Users className="text-purple-600 mb-2" size={24} />
          <div className="text-lg font-semibold">{stats?.total_users || 0}</div>
          <div className="text-sm text-gray-600">Users</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <Shield className="text-red-600 mb-2" size={24} />
          <div className="text-lg font-semibold">{((stats?.storage_used || 0) / 1024 / 1024).toFixed(1)} MB</div>
          <div className="text-sm text-gray-600">Storage Used</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings size={20} />
            System Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max File Size (MB)</label>
              <input
                type="number"
                value={settings.max_file_size}
                onChange={(e) => setSettings({...settings, max_file_size: +e.target.value})}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Allowed Formats</label>
              <div className="flex gap-2 flex-wrap">
                {['glb', 'gltf', 'obj', 'fbx', 'stl'].map(fmt => (
                  <label key={fmt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={settings.allowed_formats.includes(fmt)}
                      onChange={(e) => {
                        const formats = e.target.checked
                          ? [...settings.allowed_formats, fmt]
                          : settings.allowed_formats.filter(f => f !== fmt);
                        setSettings({...settings, allowed_formats: formats});
                      }}
                    />
                    {fmt.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auto_thumbnail}
                onChange={(e) => setSettings({...settings, auto_thumbnail: e.target.checked})}
              />
              <label className="text-sm">Auto-generate thumbnails</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enable_versioning}
                onChange={(e) => setSettings({...settings, enable_versioning: e.target.checked})}
              />
              <label className="text-sm">Enable model versioning</label>
            </div>
            <button
              onClick={saveSettings}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Recent Activity
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activities.map((activity, i) => (
              <div key={i} className="border-l-2 border-blue-500 pl-3 py-2">
                <div className="text-sm font-medium">{activity.action}</div>
                <div className="text-xs text-gray-600">
                  {activity.user_name} - {activity.created_at}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Storage Management</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Total Storage</span>
            <span className="font-bold">{((stats?.storage_used || 0) / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full"
              style={{ width: `${Math.min((stats?.storage_used || 0) / 1024 / 1024 / 1000 * 100, 100)}%` }}
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Clean Unused Models
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Archive Old Models
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Export Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
