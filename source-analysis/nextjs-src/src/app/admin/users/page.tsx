'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import EmployeeForm from '@/components/EmployeeForm';
import UserPlantDetails from '@/components/UserPlantDetails';
import api from '@/lib/api';
import RBACGuard from '@/components/RBACGuard';

import { Edit, Trash2, Building2 } from 'lucide-react';

function UserManagementContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [viewingUser, setViewingUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'operator',
    department_id: '',
    supervisor_id: '',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments')
      ]);
      
      console.log('Users API response:', usersRes.data);
      console.log('Departments API response:', deptsRes.data);
      
      const usersData = usersRes.data?.data || usersRes.data || [];
      const deptsData = deptsRes.data?.data || deptsRes.data || [];
      
      console.log('Users data:', usersData);
      console.log('Departments data:', deptsData);
      
      setUsers(usersData);
      setDepartments(deptsData);
      setSupervisors(usersData.filter((u: any) => u.role === 'supervisor'));
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error?.response?.status === 401) {
        alert.error('Session Expired', 'Please login again');
        window.location.href = '/login';
        return;
      }
      setUsers([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Remove empty password field when editing
      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }
      
      console.log('Submitting user data:', submitData);
      
      if (editingUser) {
        const response = await api.put(`/users/${editingUser.id}`, submitData);
        console.log('Update response:', response.data);
        if (response.data?.status === 'success') {
          alert.success('Success', 'User updated successfully!');
          setShowModal(false);
          setEditingUser(null);
          setFormData({
            username: '',
            email: '',
            role: 'operator',
            department_id: '',
            supervisor_id: '',
            password: ''
          });
          loadData();
        } else {
          alert.error('Error', response.data?.message || 'Update failed');
        }
      } else {
        const response = await api.post('/users', submitData);
        console.log('Create response:', response.data);
        if (response.data?.status === 'success') {
          alert.success('Success', 'User created successfully!');
          setShowModal(false);
          setFormData({
            username: '',
            email: '',
            role: 'operator',
            department_id: '',
            supervisor_id: '',
            password: ''
          });
          loadData();
        } else {
          alert.error('Error', response.data?.message || 'Creation failed');
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      console.error('Error response:', error?.response?.data);
      if (error?.response?.status === 401) {
        alert.error('Session Expired', 'Please login again');
        window.location.href = '/login';
        return;
      }
      
      // Handle validation errors
      const errorData = error?.response?.data;
      let errorMessage = 'Operation failed';
      
      if (errorData?.messages) {
        // CodeIgniter validation errors format
        const messages = Object.values(errorData.messages).join(', ');
        errorMessage = messages || errorMessage;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert.error('Error', errorMessage);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'operator',
      department_id: user.department_id || '',
      supervisor_id: user.supervisor_id || '',
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    alert.confirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/users/${id}`);
          alert.success('Success', 'User deleted successfully!');
          loadData();
        } catch (error: any) {
          alert.error('Error', 'Failed to delete user');
        }
      }
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'all' || user.department_id == filterDept;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const colors: any = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      planner: 'bg-green-100 text-green-800',
      technician: 'bg-orange-100 text-orange-800',
      operator: 'bg-gray-100 text-gray-800',
      manager: 'bg-indigo-100 text-indigo-800',
      'shop-attendant': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  console.log('Current users state:', users);
  console.log('Filtered users:', filteredUsers);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="p-4">
        {/* Header */}
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                User Management
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">Manage users and department assignments</p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  username: '',
                  email: '',
                  role: 'operator',
                  department_id: '',
                  supervisor_id: '',
                  password: ''
                });
                setShowModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2.5 py-1.5 text-sm border rounded-lg flex-1 max-w-md"
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-2.5 py-1.5 text-sm border rounded-lg"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.department_name || d.name}
                </option>
              ))}
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-2.5 py-1.5 text-sm border rounded-lg"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="planner">Planner</option>
              <option value="technician">Technician</option>
              <option value="operator">Operator</option>
              <option value="manager">Manager</option>
              <option value="shop-attendant">Shop Attendant</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 compact-table">
              <thead className="bg-gray-50">
                <tr>
                  {['Username', 'Email', 'Role', 'Department', 'Supervisor', 'Actions'].map((header) => (
                    <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-3 text-center text-sm">Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8">
                      <div className="text-center">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                        <p className="mt-1 text-xs text-gray-500">Get started by creating a new user.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">{user.email}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {departments.find(d => d.id == user.department_id)?.department_name || 
                         departments.find(d => d.id == user.department_id)?.name || 
                         'Not Assigned'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {users.find(u => u.id == user.supervisor_id)?.username || 'N/A'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setViewingUser(user)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            Plants
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-xs font-medium"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <FormModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editingUser ? 'Edit Employee' : 'Add New Employee'}
            size="xl"
          >
            <EmployeeForm
              initialData={editingUser}
              onSubmit={async (data) => {
                try {
                  if (editingUser) {
                    await api.put(`/users/${editingUser.id}`, data);
                    alert.success('Success', 'Employee updated successfully!');
                  } else {
                    await api.post('/users', data);
                    alert.success('Success', 'Employee created successfully!');
                  }
                  setShowModal(false);
                  setEditingUser(null);
                  loadData();
                } catch (error: any) {
                  const errorMsg = error?.response?.data?.message || 'Operation failed';
                  alert.error('Error', errorMsg);
                  throw error;
                }
              }}
              onCancel={() => setShowModal(false)}
              isEdit={!!editingUser}
            />
          </FormModal>
        )}

        {/* View Plants Modal */}
        {viewingUser && (
          <FormModal
            isOpen={!!viewingUser}
            onClose={() => setViewingUser(null)}
            title={`Plant Assignments - ${viewingUser.username}`}
            size="lg"
          >
            <div className="p-4">
              <UserPlantDetails userId={viewingUser.id} />
            </div>
          </FormModal>
        )}
        </div>
      </ProtectedRoute>
    );
  }

export default function UserManagementPage() {
  return (
    <RBACGuard module="users" action="view">
      <UserManagementContent />
    </RBACGuard>
  );
}
