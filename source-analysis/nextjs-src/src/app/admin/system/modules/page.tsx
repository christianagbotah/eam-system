'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, X, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function SystemModulesPage() {
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.status === 'success' && data.data) {
        setModules(data.data);
        
        const total = data.data.length;
        const licensed = data.data.filter(m => m.is_licensed == 1).length;
        const core = data.data.filter(m => m.is_core == 1).length;
        const expired = 0;
        
        setStats({ total, licensed, core, expired });
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLicense = async (code, enable) => {
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = enable ? 'license' : 'unlicense';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/${code}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        fetchModules();
        setNotification({
          show: true,
          type: 'success',
          message: `Module ${enable ? 'licensed' : 'unlicensed'} successfully`
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      } else {
        const error = await res.json();
        setNotification({
          show: true,
          type: 'error',
          message: error.messages?.error || error.message || `Failed to ${enable ? 'license' : 'unlicense'} module`
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle license:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'An error occurred'
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    }
  };

  const unlockAllModules = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/unlock-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        fetchModules();
        setShowUnlockConfirm(false);
        setNotification({
          show: true,
          type: 'success',
          message: 'All modules unlocked successfully'
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      } else {
        setNotification({
          show: true,
          type: 'error',
          message: 'Failed to unlock modules'
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      }
    } catch (error) {
      console.error('Failed to unlock modules:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'An error occurred'
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    }
  };

  const toggleLock = async (code, unlock) => {
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = unlock ? 'unlock' : 'lock';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/${code}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        fetchModules();
        setNotification({
          show: true,
          type: 'success',
          message: `Module ${unlock ? 'unlocked' : 'locked'} successfully`
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      } else {
        const error = await res.json();
        setNotification({
          show: true,
          type: 'error',
          message: error.messages?.error || error.message || `Failed to ${unlock ? 'unlock' : 'lock'} module`
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'An error occurred'
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      {notification.show && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-8 h-8" />
              System Module Licenses
            </h1>
            <p className="text-gray-600 mt-2">Manage system-wide module licensing</p>
          </div>
          <button
            onClick={() => setShowUnlockConfirm(true)}
            className="px-2 py-1 text-xs bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            🔓 Unlock All Modules
          </button>
        </div>
      </div>

      {showUnlockConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4">Unlock All Modules?</h3>
            <p className="text-gray-600 mb-6">
              This will unlock all modules (except CORE) allowing the company admin to enable/disable them.
              This action is typically done for testing purposes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUnlockConfirm(false)}
                className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={unlockAllModules}
                className="flex-1 px-2 py-1 text-xs bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                Unlock All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-base font-semibold">{stats.total || 0}</div>
          <div className="text-gray-600">Total Modules</div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow">
          <div className="text-base font-semibold text-green-600">{stats.licensed || 0}</div>
          <div className="text-gray-600">Licensed</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow">
          <div className="text-base font-semibold text-blue-600">{stats.core || 0}</div>
          <div className="text-gray-600">Core</div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg shadow">
          <div className="text-base font-semibold text-red-600">{stats.expired || 0}</div>
          <div className="text-gray-600">Expired</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {modules.map((module) => (
          <div key={module.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{module.display_name || module.name}</h3>
                  <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded">{module.code}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{module.description || module.code}</p>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                {module.is_core == 1 ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">Core</span>
                ) : module.is_licensed == 1 ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1 whitespace-nowrap">
                    <Check className="w-3 h-3" /> Licensed
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1 whitespace-nowrap">
                    <X className="w-3 h-3" /> Not Licensed
                  </span>
                )}
                {module.activation_locked == 1 ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 whitespace-nowrap">🔒 Locked</span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 whitespace-nowrap">🔓 Unlocked</span>
                )}
              </div>
            </div>
            
            <div className="space-y-2 mb-4 flex-grow">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">{module.version || '2.0.0'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{module.is_active == 1 ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Lock Status:</span>
                <span className="font-medium">{module.activation_locked == 1 ? 'Locked' : 'Unlocked'}</span>
              </div>
            </div>
            
            <div className="mt-auto space-y-2">
              {module.is_core == 1 ? (
                <div className="h-6 text-sm text-gray-500 text-center">Core Module (Always Locked)</div>
              ) : (
                <>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">
                      {module.is_licensed == 1 ? 'Licensed' : 'Not Licensed'}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={module.is_licensed == 1}
                        onChange={() => toggleLicense(module.code, module.is_licensed != 1)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">
                      {module.activation_locked == 1 ? '🔒 Locked' : '🔓 Unlocked'}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={module.activation_locked == 0}
                        onChange={() => toggleLock(module.code, module.activation_locked == 1)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </div>
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
