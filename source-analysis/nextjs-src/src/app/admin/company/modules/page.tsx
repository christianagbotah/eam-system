'use client';

import { useState, useEffect } from 'react';
import { Building2, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

export default function CompanyModulesPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

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
        const licensedModules = data.data.filter(m => m.is_licensed == 1);
        setModules(licensedModules);
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivation = async (code, activate) => {
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = activate ? 'enable' : 'disable';
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
          message: `Module ${activate ? 'enabled' : 'disabled'} successfully`
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      } else {
        const error = await res.json();
        setNotification({
          show: true,
          type: 'error',
          message: error.message || `Failed to ${activate ? 'enable' : 'disable'} module`
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle activation:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'An error occurred'
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    }
  };

  const getStatusBadge = (module) => {
    if (module.is_core == 1) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
        <CheckCircle className="w-3 h-3" /> Core
      </span>;
    }

    if (module.is_active == 1) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
        <CheckCircle className="w-3 h-3" /> Active
      </span>;
    }

    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1 w-fit">
      <XCircle className="w-3 h-3" /> Inactive
    </span>;
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (!modules || modules.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Company Module Activation
          </h1>
          <p className="text-gray-600 mt-2">Activate or deactivate modules for your company</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">No modules available. Please check your system license configuration.</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          Company Module Activation
        </h1>
        <p className="text-gray-600 mt-2">Activate or deactivate modules for your company</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {modules.map((module) => (
          <div key={module.code} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{module.display_name || module.name}</h3>
                  <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded">{module.code}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{module.description}</p>
              </div>
              {getStatusBadge(module)}
            </div>
            
            <div className="space-y-2 mb-4 flex-grow">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">{module.version || '2.0.0'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Licensed:</span>
                <span className="font-medium">{module.is_licensed == 1 ? 'Yes' : 'No'}</span>
              </div>
            </div>
            
            <div className="mt-auto">
              {module.is_core == 1 ? (
                <div className="h-6 text-sm text-gray-500 text-center">Core Module</div>
              ) : (
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">
                    {module.is_active == 1 ? 'Enabled' : 'Disabled'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={module.is_active == 1}
                      onChange={() => toggleActivation(module.code, module.is_active != 1)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
