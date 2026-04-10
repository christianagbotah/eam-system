'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Key, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import StatusModal from '@/components/ui/StatusModal';

export default function RBACManagement() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '', hierarchy_level: 50 });
  const [roleFilter, setRoleFilter] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [matrixModuleFilter, setMatrixModuleFilter] = useState('all');
  const [matrixSearchFilter, setMatrixSearchFilter] = useState('');
  const [editingPermission, setEditingPermission] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success' as 'success' | 'error', title: '', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get auth token from localStorage (stored by tokenManager)
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('No authentication token found');
        alert('Please login to access RBAC management');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch('http://localhost/factorymanager/public/index.php/api/v1/eam/rbac/matrix', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('RBAC API Response:', data);
      
      if (response.status === 401) {
        console.error('Authentication failed');
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Authentication Failed',
          message: 'Session expired. Please login again.'
        });
        setTimeout(() => window.location.href = '/login', 2000);
        return;
      }
      
      if (data.status === 'success') {
        setRoles(data.data.roles);
        setPermissions(data.data.permissions);
        setMatrix(data.data.matrix);
      } else {
        console.error('API returned error:', data);
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to load RBAC data'
        });
      }
    } catch (error) {
      console.error('Error fetching RBAC data:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: 'Please check if backend is running.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = async (roleId, permissionId) => {
    const currentPermissions = matrix[roleId] || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(id => id !== permissionId)
      : [...currentPermissions, permissionId];

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        alert('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(
        `http://localhost/factorymanager/public/index.php/api/v1/eam/rbac/roles/${roleId}/permissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ permission_ids: newPermissions })
        }
      );

      if (response.ok) {
        setMatrix({ ...matrix, [roleId]: newPermissions });
      } else {
        const data = await response.json();
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to update permissions'
        });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating permissions'
      });
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  // Get unique modules for filter
  const modules = ['all', ...Object.keys(groupedPermissions)];

  // Filter roles
  const filteredRoles = roles.filter(role => 
    role.display_name.toLowerCase().includes(roleFilter.toLowerCase()) ||
    role.description.toLowerCase().includes(roleFilter.toLowerCase())
  );

  // Filter permissions
  const filteredPermissions = permissions.filter(perm => {
    const matchesSearch = perm.display_name.toLowerCase().includes(permissionFilter.toLowerCase()) ||
                         perm.name.toLowerCase().includes(permissionFilter.toLowerCase());
    const matchesModule = moduleFilter === 'all' || perm.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const filteredGroupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  // Filter for matrix tab
  const matrixFilteredPermissions = permissions.filter(perm => {
    const matchesSearch = matrixSearchFilter === '' || 
                         perm.display_name.toLowerCase().includes(matrixSearchFilter.toLowerCase()) ||
                         perm.name.toLowerCase().includes(matrixSearchFilter.toLowerCase());
    const matchesModule = matrixModuleFilter === 'all' || perm.module === matrixModuleFilter;
    return matchesSearch && matchesModule;
  });

  const matrixFilteredGrouped = matrixFilteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const handleEditPermission = (permission) => {
    setEditingPermission(permission);
    setShowPermissionModal(true);
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setNewRole({ name: '', display_name: '', description: '', hierarchy_level: 50 });
    setShowRoleModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      hierarchy_level: role.hierarchy_level
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Authentication Required',
          message: 'Please login again.'
        });
        return;
      }

      // Validation - skip name check for system roles when editing
      if (!editingRole || (editingRole.is_system_role != 1 && editingRole.is_system_role !== '1')) {
        if (!newRole.name) {
          setStatusModal({
            isOpen: true,
            type: 'error',
            title: 'Validation Error',
            message: 'Role name is required.'
          });
          return;
        }
      }

      if (!newRole.display_name || !newRole.hierarchy_level) {
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Validation Error',
          message: 'Display name and hierarchy level are required.'
        });
        return;
      }

      const url = editingRole
        ? `http://localhost/factorymanager/public/index.php/api/v1/eam/rbac/roles/${editingRole.id}`
        : 'http://localhost/factorymanager/public/index.php/api/v1/eam/rbac/roles';
      
      const method = editingRole ? 'PUT' : 'POST';

      // Build payload - exclude name for system roles when editing
      const payload: any = {
        display_name: newRole.display_name,
        description: newRole.description,
        hierarchy_level: newRole.hierarchy_level
      };

      // Only include name for new roles or non-system roles
      // Check for both string "1" and number 1 since backend returns string
      if (!editingRole || (editingRole.is_system_role != 1 && editingRole.is_system_role !== '1')) {
        payload.name = newRole.name;
      }

      console.log('Saving role:', { editingRole, payload });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Save role response:', response.status, data);
      console.log('Response messages:', data.messages);
      console.log('Response error:', data.error);
      console.log('Response message:', data.message);

      if (response.ok && data.status === 'success') {
        setShowRoleModal(false);
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: editingRole ? 'Role updated successfully!' : 'Role created successfully!'
        });
        fetchData();
      } else {
        console.error('Save role failed:', data);
        // Handle validation errors
        let errorMessage = 'Failed to save role';
        if (data.messages) {
          // Validation errors from CodeIgniter
          errorMessage = Object.values(data.messages).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Error saving role:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Error saving role: ${error.message}`
      });
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(
        `http://localhost/factorymanager/public/index.php/api/v1/eam/rbac/roles/${roleId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Role deleted successfully!'
        });
        fetchData();
      } else {
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to delete role'
        });
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error deleting role'
      });
    }
  };

  const handleSavePermission = async () => {
    if (!editingPermission) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `http://localhost/factorymanager/public/index.php/api/v1/eam/rbac/permissions/${editingPermission.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            display_name: editingPermission.display_name,
            description: editingPermission.description
          })
        }
      );

      if (response.ok) {
        // Update local state
        setPermissions(permissions.map(p => 
          p.id === editingPermission.id ? editingPermission : p
        ));
        setShowPermissionModal(false);
        setEditingPermission(null);
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Permission updated successfully!'
        });
      } else {
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: 'Failed to update permission'
        });
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error updating permission'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          RBAC Management
        </h1>
        <p className="text-gray-600 mt-2">Manage roles, permissions, and user access control</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Roles
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Permissions
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'matrix'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Permission Matrix
          </button>
        </nav>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="text-xl font-semibold">System Roles</h2>
              <input
                type="text"
                placeholder="Search roles..."
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button 
              onClick={handleCreateRole}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Role
            </button>
          </div>
          <div className="p-4">
            <div className="grid gap-3">
              {filteredRoles.map(role => (
                <div key={role.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{role.display_name}</h3>
                        {role.is_system_role === 1 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">System</span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded">
                          Level {role.hierarchy_level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex-1">{role.description}</p>
                      <p className="text-sm text-gray-500 whitespace-nowrap">
                        Permissions: {(matrix[role.id] || []).length} / {permissions.length}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button 
                        onClick={() => handleEditRole(role)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Role"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {role.is_system_role === 0 && (
                        <button 
                          onClick={() => handleDeleteRole(role.id, role.display_name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">System Permissions</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Permission
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search permissions..."
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="w-64">
                <SearchableSelect
                  value={moduleFilter}
                  onChange={(value) => setModuleFilter(value)}
                  options={modules.map(m => ({
                    id: m,
                    label: m === 'all' ? 'All Modules' : m.replace(/_/g, ' ').toUpperCase()
                  }))}
                  placeholder="Select Module"
                />
              </div>
            </div>
          </div>
          <div className="p-4">
            {Object.entries(filteredGroupedPermissions).map(([module, perms]) => (
              <div key={module} className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 capitalize bg-gray-50 px-3 py-2 rounded-lg border-l-4 border-blue-600">
                  {module.replace(/_/g, ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {perms.map(perm => (
                    <div key={perm.id} className="border rounded p-3 hover:shadow-sm transition-shadow group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{perm.display_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{perm.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {perm.is_system_permission === 1 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">System</span>
                          )}
                          <button
                            onClick={() => handleEditPermission(perm)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-opacity"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold mb-3">Permission Matrix</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search permissions..."
                value={matrixSearchFilter}
                onChange={(e) => setMatrixSearchFilter(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="w-64">
                <SearchableSelect
                  value={matrixModuleFilter}
                  onChange={(value) => setMatrixModuleFilter(value)}
                  options={modules.map(m => ({
                    id: m,
                    label: m === 'all' ? 'All Modules' : m.replace(/_/g, ' ').toUpperCase()
                  }))}
                  placeholder="Select Module"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Toggle permissions for each role</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                    Permission
                  </th>
                  {roles.map(role => (
                    <th key={role.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <div className="flex flex-col items-center">
                        <span>{role.display_name}</span>
                        <span className="text-xs text-gray-400 font-normal">L{role.hierarchy_level}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(matrixFilteredGrouped).map(([module, perms]) => (
                  <>
                    <tr key={module} className="bg-gray-100">
                      <td colSpan={roles.length + 1} className="px-4 py-2 font-bold text-sm capitalize text-gray-900">
                        {module.replace(/_/g, ' ')}
                      </td>
                    </tr>
                    {perms.map(perm => (
                      <tr key={perm.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm sticky left-0 bg-white">
                          <div>
                            <p className="font-medium">{perm.display_name}</p>
                            <p className="text-xs text-gray-500">{perm.action}</p>
                          </div>
                        </td>
                        {roles.map(role => (
                          <td key={role.id} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={(matrix[role.id] || []).includes(perm.id)}
                              onChange={() => handlePermissionToggle(role.id, perm.id)}
                              disabled={role.name === 'admin'}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <StatusModal
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />

      {/* Create/Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name (Key) *</label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., quality_inspector"
                  disabled={editingRole && (editingRole.is_system_role == 1 || editingRole.is_system_role === '1')}
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase with underscores, no spaces</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={newRole.display_name}
                  onChange={(e) => setNewRole({...newRole, display_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Quality Inspector"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe the role's responsibilities..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy Level (0-100) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newRole.hierarchy_level}
                  onChange={(e) => setNewRole({...newRole, hierarchy_level: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Higher number = more authority (Admin=100, Operator=30)</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingRole ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permission Modal */}
      {showPermissionModal && editingPermission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Permission</h3>
              <button onClick={() => setShowPermissionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingPermission.display_name}
                  onChange={(e) => setEditingPermission({...editingPermission, display_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permission Key</label>
                <input
                  type="text"
                  value={editingPermission.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <input
                  type="text"
                  value={editingPermission.module}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <input
                  type="text"
                  value={editingPermission.action}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermission}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
