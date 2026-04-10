'use client'
import { useState, useEffect } from 'react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import FormInput from '@/components/FormInput'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/utils/permissions'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { TableSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ username: '', email: '', full_name: '', password: '', role: 'technician', status: 'active' })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const itemsPerPage = 10
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(filteredUsers)

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? users.filter((u: any) => selectedIds.includes(u.id)) : users;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((u: any) => Object.values(u).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Users exported');
  };

  useKeyboardShortcuts({
    onNew: () => { resetForm(); setIsModalOpen(true); },
    onExport: handleExport,
    onClose: () => { setIsModalOpen(false); resetForm(); }
  });

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const filtered = users.filter((u: any) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [search, users])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users')
      setUsers((res.data as any)?.data || [])
    } catch (err) {
      showToast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = showToast.loading(editingId ? 'Updating...' : 'Creating...')
    try {
      if (editingId) {
        const updateData = { ...formData }
        if (!updateData.password) delete updateData.password
        await api.put(`/users/${editingId}`, updateData)
        showToast.dismiss(loadingToast)
        showToast.success('User updated')
      } else {
        await api.post('/users', formData)
        showToast.dismiss(loadingToast)
        showToast.success('User created')
      }
      setIsModalOpen(false)
      fetchUsers()
      resetForm()
    } catch (err) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to save user')
    }
  }

  const handleEdit = (row: any) => {
    setEditingId(row.id)
    setFormData({ username: row.username, email: row.email, full_name: row.full_name, password: '', role: row.role, status: row.status })
    setIsModalOpen(true)
  }

  const handleDelete = async (row: any) => {
    if (confirm('Delete this user?')) {
      const loadingToast = showToast.loading('Deleting...')
      try {
        await api.delete(`/users/${row.id}`)
        showToast.dismiss(loadingToast)
        showToast.success('User deleted')
        fetchUsers()
      } catch (error) {
        showToast.dismiss(loadingToast)
        showToast.error('Failed to delete')
      }
    }
  }

  const resetForm = () => {
    setFormData({ username: '', email: '', full_name: '', password: '', role: 'technician', status: 'active' })
    setEditingId(null)
  }

  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (val: string) => <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{val}</span> },
    { key: 'status', label: 'Status', render: (val: string) => <span className={`px-2 py-1 rounded text-xs ${val === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{val}</span> },
  ]

  const paginatedData = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">User Management</h1>
            <p className="text-blue-100">Manage system users, roles, and permissions</p>
          </div>
          <div className="flex gap-2">
            <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
            {hasPermission(user?.role || '', 'create') && (
              <button onClick={() => { resetForm(); setIsModalOpen(true) }} className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1.5 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-lg font-semibold text-gray-900">{users.length}</p>
              <p className="text-xs text-gray-500 mt-1">All system users</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Users</p>
              <p className="text-lg font-semibold text-green-600">{users.filter((u: any) => u.status === 'active').length}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Admins</p>
              <p className="text-lg font-semibold text-purple-600">{users.filter((u: any) => u.role === 'admin').length}</p>
              <p className="text-xs text-gray-500 mt-1">System admins</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Technicians</p>
              <p className="text-lg font-semibold text-orange-600">{users.filter((u: any) => u.role === 'technician').length}</p>
              <p className="text-xs text-gray-500 mt-1">Field workers</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={filteredUsers.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkExport={handleExport}
      />

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-semibold text-gray-900">Users List</h3>
          <p className="text-sm text-xs text-gray-600 mt-0.5">{filteredUsers.length} users found</p>
        </div>
        {loading ? (
          <div className="p-6"><TableSkeleton rows={10} /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600 mb-6">Create your first user or adjust your search</p>
            {hasPermission(user?.role || '', 'create') && (
              <button onClick={() => { resetForm(); setIsModalOpen(true) }} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            )}
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={paginatedData} 
            onEdit={hasPermission(user?.role || '', 'update') ? handleEdit : undefined}
            onDelete={hasPermission(user?.role || '', 'delete') ? handleDelete : undefined}
          />
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingId ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
          <FormInput label="Full Name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
          <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <FormInput label="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editingId} placeholder={editingId ? 'Leave blank to keep current' : ''} />
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <option value="admin">👨‍💼 Admin</option>
              <option value="manager">📊 Manager</option>
              <option value="supervisor">👷 Supervisor</option>
              <option value="planner">📋 Planner</option>
              <option value="technician">🔧 Technician</option>
              <option value="operator">👨‍🏭 Operator</option>
              <option value="shop-attendant">📦 Shop Attendant</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <option value="active">✅ Active</option>
              <option value="inactive">❌ Inactive</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg font-bold shadow-lg hover:shadow-xl transition-all">Save User</button>
        </form>
      </Modal>
    </div>
  )
}
