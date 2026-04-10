'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/dateUtils';

interface Module {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  route_prefix: string;
  is_core: boolean;
  is_licensed: boolean;
  is_active: boolean;
  licensed_at: string | null;
  activated_at: string | null;
  license_expires_at: string | null;
}

export default function GlobalModuleManagement() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const res = await api.get('/modules');
      setModules(res.data?.data || []);
    } catch (error) {
      showToast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.get('/modules/logs');
      setLogs(res.data?.data || []);
      setShowLogs(true);
    } catch (error) {
      showToast.error('Failed to load logs');
    }
  };

  const handleToggle = async (module: Module) => {
    if (module.is_core) {
      showToast.error('Cannot disable core module');
      return;
    }

    if (!module.is_licensed) {
      showToast.error('Module not licensed. Contact your vendor.');
      return;
    }

    const action = module.is_active ? 'disable' : 'enable';
    const toast = showToast.loading(`${action === 'enable' ? 'Enabling' : 'Disabling'} module...`);

    try {
      await api.post(`/modules/${module.name}/${action}`);
      showToast.dismiss(toast);
      showToast.success(`Module ${action}d successfully`);
      loadModules();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || `Failed to ${action} module`);
    }
  };

  const getStatusBadge = (module: Module) => {
    if (!module.is_licensed) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">NOT LICENSED</span>;
    }
    if (module.is_active) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-300">ACTIVE</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800 border border-gray-300">DISABLED</span>;
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Global Module Management</h1>
            <p className="text-gray-500 mt-1">Manage enterprise modules across all plants</p>
          </div>
          <button onClick={loadLogs} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg">
            📋 View Audit Logs
          </button>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Enterprise Module Activation</h3>
              <p className="mt-1 text-sm text-blue-700">
                Modules activated here work automatically across all plants. Plants control data scope, not module availability.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading modules...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((module) => (
              <div key={module.id} className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all ${module.is_active ? 'border-green-500' : module.is_licensed ? 'border-gray-300' : 'border-red-300'}`}>
                <div className={`p-4 ${module.is_active ? 'bg-gradient-to-r from-green-500 to-green-600' : module.is_licensed ? 'bg-gray-100' : 'bg-red-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{module.icon}</span>
                      <h3 className={`text-lg font-bold ${module.is_active ? 'text-white' : 'text-gray-900'}`}>{module.display_name}</h3>
                    </div>
                    {module.is_licensed && !module.is_core && (
                      <button onClick={() => handleToggle(module)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${module.is_active ? 'bg-white' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${module.is_active ? 'translate-x-6 bg-green-600' : 'translate-x-1 bg-white'}`} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-600">{module.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xs font-medium text-gray-500">Status</span>
                    {getStatusBadge(module)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Module Code</span>
                    <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{module.name}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Route</span>
                    <code className="px-2 py-1 bg-blue-50 rounded text-xs font-mono">/{module.route_prefix}</code>
                  </div>
                  {module.activated_at && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Activated {formatDateTime(module.activated_at)}</span>
                      </div>
                    </div>
                  )}
                  {module.is_core && (
                    <div className="pt-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-300">CORE MODULE</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showLogs && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-base font-semibold">Module Activation Logs</h2>
                <button onClick={() => setShowLogs(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.display_name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.action === 'activated' || log.action === 'licensed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{log.username || 'System'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.performed_by_role}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
