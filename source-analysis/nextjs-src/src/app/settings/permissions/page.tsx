'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import { Lock, Shield, Search, Download, ChevronDown, ChevronRight } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  module: string;
  category?: string;
  is_system: boolean;
}

interface PermissionModule {
  name: string;
  count: number;
  permissions: Permission[];
  expanded: boolean;
}

export default function PermissionsPage() {
  const { hasPermission } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  const canView = hasPermission('permissions.view');

  useEffect(() => {
    if (canView) fetchPermissions();
  }, [canView]);

  useEffect(() => {
    if (permissions.length > 0) {
      groupPermissionsByModule();
    }
  }, [permissions, searchTerm, selectedModule]);

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions');
      if (response.data?.status === 'success') {
        setPermissions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupPermissionsByModule = () => {
    let filtered = permissions;
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedModule !== 'all') {
      filtered = filtered.filter(p => p.module === selectedModule);
    }

    const grouped = filtered.reduce((acc, perm) => {
      const module = perm.module || 'Other';
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);

    const moduleList = Object.entries(grouped).map(([name, perms]) => ({
      name,
      count: perms.length,
      permissions: perms,
      expanded: selectedModule !== 'all' || searchTerm !== ''
    }));

    setModules(moduleList.sort((a, b) => b.count - a.count));
  };

  const toggleModule = (moduleName: string) => {
    setModules(modules.map(m => 
      m.name === moduleName ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const handleExport = () => {
    const csv = [
      ['Module', 'Permission', 'Display Name', 'Description', 'System'],
      ...permissions.map(p => [p.module, p.name, p.display_name, p.description, p.is_system ? 'Yes' : 'No'])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const uniqueModules = Array.from(new Set(permissions.map(p => p.module))).sort();
  const totalPermissions = permissions.length;
  const systemPermissions = permissions.filter(p => p.is_system).length;
  const customPermissions = totalPermissions - systemPermissions;

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <Lock className="w-5 h-5 inline mr-2" />
          You don't have permission to view permissions.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Permission Management</h1>
            <p className="text-indigo-100">System-wide permission registry and access control</p>
          </div>
          <button onClick={handleExport} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 font-semibold border border-white/30">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Permissions</div>
              <div className="text-2xl font-bold text-gray-800">{totalPermissions}</div>
            </div>
            <Shield className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Modules</div>
              <div className="text-2xl font-bold text-blue-600">{uniqueModules.length}</div>
            </div>
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">System</div>
              <div className="text-2xl font-bold text-purple-600">{systemPermissions}</div>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Custom</div>
              <div className="text-2xl font-bold text-green-600">{customPermissions}</div>
            </div>
            <Lock className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Modules ({totalPermissions})</option>
            {uniqueModules.map(module => (
              <option key={module} value={module}>
                {module} ({permissions.filter(p => p.module === module).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions List */}
      <div className="space-y-3">
        {modules.map((module) => (
          <div key={module.name} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              onClick={() => toggleModule(module.name)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {module.expanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <Shield className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{module.name}</h3>
                  <p className="text-sm text-gray-600">{module.count} permissions</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                {module.count}
              </span>
            </div>
            {module.expanded && (
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permission</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {module.permissions.map((perm) => (
                        <tr key={perm.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{perm.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{perm.display_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{perm.description}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              perm.is_system ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {perm.is_system ? 'System' : 'Custom'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No permissions found</p>
        </div>
      )}
    </div>
  );
}
