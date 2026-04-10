'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { showToast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

const TIER_COLORS = {
  basic: 'bg-gray-100 text-gray-800 border-gray-300',
  professional: 'bg-blue-100 text-blue-800 border-blue-300',
  enterprise: 'bg-purple-100 text-purple-800 border-purple-300'
};

export default function ModuleSettings() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVendorAdmin, setIsVendorAdmin] = useState(false);

  useEffect(() => { 
    checkVendorAdmin();
    loadModules(); 
  }, []);

  const checkVendorAdmin = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsVendorAdmin(user.is_vendor_admin === 1 || user.is_vendor_admin === true);
    } catch (error) {
      setIsVendorAdmin(false);
    }
  };

  const loadModules = async () => {
    try {
      const endpoint = isVendorAdmin ? '/licensing/modules' : '/modules';
      const res = await api.get(endpoint);
      setModules((res.data as any)?.data || []);
    } catch (error) {
      showToast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    if (!isVendorAdmin) {
      showToast.error('Only Vendor Administrators can modify module settings');
      return;
    }
    
    const toast = showToast.loading('Updating...');
    try {
      await api.put(`/licensing/modules/${id}`, { is_enabled: !currentStatus });
      showToast.dismiss(toast);
      showToast.success(`Module ${!currentStatus ? 'enabled' : 'disabled'}`);
      loadModules();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || 'Failed to update');
    }
  };

  const handleSeed = async () => {
    if (!isVendorAdmin) {
      showToast.error('Only Vendor Administrators can seed modules');
      return;
    }
    
    const toast = showToast.loading('Seeding modules...');
    try {
      await api.post('/modules/seed', {});
      showToast.dismiss(toast);
      showToast.success('Modules seeded successfully');
      loadModules();
    } catch (error: any) {
      showToast.dismiss(toast);
      showToast.error(error.response?.data?.message || 'Failed to seed');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4 space-y-4">
        {!isVendorAdmin && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>View Only Mode:</strong> Only Vendor System Administrators can modify module settings and licensing.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Module Settings {isVendorAdmin && <span className="text-purple-600">(Vendor Admin)</span>}</h1>
            <p className="text-gray-500 mt-1">Manage system modules and subscriptions</p>
          </div>
          {isVendorAdmin && (
            <button onClick={handleSeed} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg">
              🌱 Seed Modules
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading modules...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((module) => (
              <div key={module.id} className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all ${module.is_enabled ? 'border-green-500' : 'border-gray-200'}`}>
                <div className={`p-4 ${module.is_enabled ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold ${module.is_enabled ? 'text-white' : 'text-gray-900'}`}>
                      {module.display_name}
                    </h3>
                    <button onClick={() => handleToggle(module.id, module.is_enabled)} disabled={!isVendorAdmin} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${module.is_enabled ? 'bg-white' : 'bg-gray-300'} ${!isVendorAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${module.is_enabled ? 'translate-x-6 bg-green-600' : 'translate-x-1 bg-white'}`} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-600">{module.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xs font-medium text-gray-500">Subscription Tier</span>
                    {module.requires_subscription ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${TIER_COLORS[module.subscription_tier as keyof typeof TIER_COLORS]}`}>
                        {module.subscription_tier?.toUpperCase()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-300">
                        FREE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Updated {formatDate(module.updated_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Subscription Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
              <h4 className="font-bold text-gray-900 mb-2">Basic</h4>
              <p className="text-sm text-gray-600">Core EAM features for small teams</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-blue-500">
              <h4 className="font-bold text-blue-900 mb-2">Professional</h4>
              <p className="text-sm text-gray-600">Advanced features + IoT integration</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-purple-500">
              <h4 className="font-bold text-purple-900 mb-2">Enterprise</h4>
              <p className="text-sm text-gray-600">Full suite + AI + custom modules</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
