'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Users, Mail, Phone, Award, Search } from 'lucide-react';

export default function SupervisorTeamPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, technicians: 0, operators: 0, active: 0 });

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMembers(teamMembers.filter(member =>
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredMembers(teamMembers);
    }
  }, [teamMembers, searchTerm]);

  const loadTeam = async () => {
    try {
      const response = await api.get('/users');
      const allUsers = response.data?.data || [];
      const team = allUsers.filter((u: any) => 
        u.role === 'technician' || u.role === 'operator'
      );
      setTeamMembers(team);
      
      setStats({
        total: team.length,
        technicians: team.filter((u: any) => u.role === 'technician').length,
        operators: team.filter((u: any) => u.role === 'operator').length,
        active: team.filter((u: any) => u.is_active).length
      });
    } catch (error) {
      console.error('Error loading team:', error);
      alert.error('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'technician':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'operator':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Team</h1>
            <p className="text-indigo-100">Manage your team members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Members</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Technicians</p>
                <p className="text-lg font-semibold">{stats.technicians}</p>
              </div>
              <Award className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Operators</p>
                <p className="text-lg font-semibold">{stats.operators}</p>
              </div>
              <Users className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Active</p>
                <p className="text-lg font-semibold">{stats.active}</p>
              </div>
              <Users className="w-8 h-8 text-white/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading team members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No team members found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-6">
              {filteredMembers.map((member) => (
                <div key={member.id} className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-base font-semibold flex-shrink-0">
                      {member.name?.[0]?.toUpperCase() || member.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{member.name || member.username}</h3>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border mt-1 ${getRoleBadge(member.role)}`}>
                        {member.role?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {member.department_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{member.department_name}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
