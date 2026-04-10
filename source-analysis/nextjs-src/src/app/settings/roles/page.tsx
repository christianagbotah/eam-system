'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import { Shield, Plus, Users, Key, Edit, Trash2, Search } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  hierarchy_level: number;
  is_system_role: boolean;
  is_active: boolean;
  user_count?: number;
  permission_count?: number;
  created_at: string;
}

export default function RolesPage() {
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  const canCreate = hasPermission('roles.create');
  const canEdit = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    let filtered = roles;
    if (searchTerm) {
      filtered = filtered.filter(role =>
        role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredRoles(filtered);
    setCurrentPage(1);
  }, [roles, searchTerm]);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      if (response.data?.status === 'success') {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, isSystemRole: boolean) => {
    if (isSystemRole) {
      alert('Cannot delete system roles');
      return;
    }
    if (!canDelete || !confirm('Delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Display Name', 'Description', 'Hierarchy Level', 'System Role', 'Active', 'Users', 'Permissions'],
      ...filteredRoles.map(r => [r.name, r.display_name, r.description, r.hierarchy_level, r.is_system_role ? 'Yes' : 'No', r.is_active ? 'Yes' : 'No', r.user_count || 0, r.permission_count || 0])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roles-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getHierarchyColor = (level: number) => {
    if (level >= 90) return 'bg-purple-100 text-purple-800';
    if (level >= 70) return 'bg-blue-100 text-blue-800';
    if (level >= 50) return 'bg-green-100 text-green-800';
    if (level >= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const currentRoles = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const systemRoles = roles.filter(r => r.is_system_role).length;
  const customRoles = roles.filter(r => !r.is_system_role).length;
  const activeRoles = roles.filter(r => r.is_active).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Role Management</h1>
            <p className="text-purple-100">Configure user roles and access levels</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 font-semibold border border-white/30">
              <Shield className="w-4 h-4" /> Export
            </button>
            {canCreate && (
              <button onClick={() => { setShowModal(true); setSelectedRole(null); }} className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2 font-semibold">
                <Plus className="w-4 h-4" /> Add Role
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Roles</div>
              <div className="text-2xl font-bold text-gray-800">{roles.length}</div>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">System Roles</div>
              <div className="text-2xl font-bold text-blue-600">{systemRoles}</div>
            </div>
            <Key className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Custom Roles</div>
              <div className="text-2xl font-bold text-green-600">{customRoles}</div>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active</div>
              <div className="text-2xl font-bold text-indigo-600">{activeRoles}</div>
            </div>
            <Shield className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentRoles.map((role) => (
          <div key={role.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{role.display_name || role.name}</h3>
                  {role.is_system_role && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      System
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getHierarchyColor(role.hierarchy_level)}`}>
                  Level {role.hierarchy_level}
                </span>
              </div>
              <Shield className="w-5 h-5 text-purple-600 flex-shrink-0" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Users:</span>
                <span className="font-semibold text-gray-900">{role.user_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Permissions:</span>
                <span className="font-semibold text-purple-600">{role.permission_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${role.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                  {role.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              {canEdit && (
                <button
                  onClick={() => { setSelectedRole(role); setShowModal(true); }}
                  className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-2 text-sm font-medium"
                  disabled={role.is_system_role}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(role.id, role.is_system_role)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={role.is_system_role}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No roles found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of {filteredRoles.length} roles
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <RoleModal
          role={selectedRole}
          onClose={() => { setShowModal(false); setSelectedRole(null); }}
          onSuccess={() => { fetchRoles(); setShowModal(false); setSelectedRole(null); }}
        />
      )}
    </div>
  );
}

function RoleModal({ role, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    display_name: role?.display_name || '',
    description: role?.description || '',
    hierarchy_level: role?.hierarchy_level || 50,
    is_active: role?.is_active ?? true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (role) {
        await api.put(`/roles/${role.id}`, formData);
      } else {
        await api.post('/roles', formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to save role');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{role ? 'Edit' : 'Create'} Role</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name (slug)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., custom_role"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Custom Role"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Describe the role's purpose and responsibilities"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy Level (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.hierarchy_level}
                onChange={(e) => setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Higher values = more authority (Admin: 100, Manager: 80, Operator: 30)</p>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              {role ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}