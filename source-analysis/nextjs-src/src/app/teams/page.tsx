'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import { Users, Plus, Download, Mail, Phone, Award, Search, UserCheck, UserX } from 'lucide-react';

interface TeamMember {
  id: number;
  name?: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  department_name?: string;
  is_active: boolean;
}

export default function TeamsPage() {
  const { hasPermission } = usePermissions();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const canView = hasPermission('teams.view');
  const canExport = hasPermission('teams.export');

  useEffect(() => {
    if (canView) {
      loadTeam();
    }
  }, [canView]);

  useEffect(() => {
    let filtered = teamMembers;
    
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter) {
      filtered = filtered.filter(member => member.role === roleFilter);
    }
    
    setFilteredMembers(filtered);
    setCurrentPage(1);
  }, [teamMembers, searchTerm, roleFilter]);

  const loadTeam = async () => {
    try {
      const response = await api.get('/users');
      const allUsers = response.data?.data || [];
      setTeamMembers(allUsers);
    } catch (error) {
      console.error('Error loading team:', error);
      showToast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Username', 'Email', 'Phone', 'Role', 'Department', 'Status'],
      ...filteredMembers.map(m => [
        m.name || '',
        m.username,
        m.email || '',
        m.phone || '',
        m.role,
        m.department_name || '',
        m.is_active ? 'Active' : 'Inactive'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Team members exported successfully');
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      supervisor: 'bg-indigo-100 text-indigo-800',
      technician: 'bg-cyan-100 text-cyan-800',
      operator: 'bg-green-100 text-green-800',
      planner: 'bg-yellow-100 text-yellow-800',
      'shop-attendant': 'bg-orange-100 text-orange-800'
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter(m => m.is_active).length,
    inactive: teamMembers.filter(m => !m.is_active).length,
    roles: [...new Set(teamMembers.map(m => m.role))].length
  };

  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Team Management</h1>
                <p className="text-indigo-100 mt-1">Manage your team members and roles</p>
              </div>
            </div>
            <div className="flex gap-3">
              {canExport && (
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards in Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Members</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-white/60" />
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <UserCheck className="w-8 h-8 text-white/60" />
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Inactive</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
                <UserX className="w-8 h-8 text-white/60" />
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Roles</p>
                  <p className="text-2xl font-bold">{stats.roles}</p>
                </div>
                <Award className="w-8 h-8 text-white/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="technician">Technician</option>
              <option value="operator">Operator</option>
              <option value="planner">Planner</option>
              <option value="shop-attendant">Shop Attendant</option>
            </select>
          </div>
        </div>

        {/* Team Members Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading team members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {paginatedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {member.name?.[0]?.toUpperCase() || member.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {member.name || member.username}
                        </h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getRoleBadge(member.role)}`}>
                          {member.role?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {member.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.department_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{member.department_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.is_active ? '✓ Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} members
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
