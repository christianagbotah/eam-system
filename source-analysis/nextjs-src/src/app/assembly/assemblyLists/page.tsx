'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import FormModal from '@/components/ui/FormModal';
import AssemblyForm from '@/components/forms/AssemblyForm';

export default function AssemblyListsPage() {
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', criticality: '', status: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const searchParams = useSearchParams();
  const machineId = searchParams.get('machine_id');

  useEffect(() => {
    fetchAssemblies();
  }, [filters, machineId]);

  const fetchAssemblies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assemblies');
      let filtered = response.data?.data || [];
      if (machineId) filtered = filtered.filter((a: any) => a.equipment_id === parseInt(machineId));
      setAssemblies(filtered);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssemblies = assemblies.filter(assembly => {
    if (filters.search && !assembly.assembly_name?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !assembly.assembly_code?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && assembly.assembly_category !== filters.category) return false;
    if (filters.criticality && assembly.criticality !== filters.criticality) return false;
    if (filters.status && assembly.status !== filters.status) return false;
    return true;
  });

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Assemblies</h1>
          <p className="text-xs text-gray-600 mt-0.5">{filteredAssemblies.length} assemblies found</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Assembly
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <input
              type="text"
              placeholder="Search assemblies..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="mechanical">Mechanical</option>
            <option value="electrical">Electrical</option>
            <option value="hydraulic">Hydraulic</option>
            <option value="pneumatic">Pneumatic</option>
          </select>
          <select
            value={filters.criticality}
            onChange={(e) => setFilters({...filters, criticality: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Criticality</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssemblies.map(assembly => (
            <div key={assembly.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Assembly Image */}
              <div className="h-40 bg-gray-100 relative overflow-hidden">
                {assembly.assembly_image || assembly.image ? (
                  <img 
                    src={assembly.assembly_image || assembly.image} 
                    alt={assembly.assembly_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                    <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm bg-white/90 ${
                    assembly.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {assembly.status}
                  </span>
                  {assembly.criticality && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm bg-white/90 ${getCriticalityColor(assembly.criticality)}`}>
                      {assembly.criticality}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{assembly.assembly_name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{assembly.assembly_code}</p>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {assembly.assembly_category && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span className="capitalize">{assembly.assembly_category}</span>
                    </div>
                  )}
                  {assembly.description && (
                    <p className="text-gray-600 line-clamp-2">{assembly.description}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    {assembly.parts_count || 0} parts
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/parts/partLists?assembly_id=${assembly.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Parts
                    </Link>
                    <span className="text-gray-300">•</span>
                    <button
                      onClick={() => {
                        setEditingAssembly(assembly);
                        setShowEditModal(true);
                      }}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">•</span>
                    <Link href={`/assembly/${assembly.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assembly</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criticality</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parts</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssemblies.map(assembly => (
                  <tr key={assembly.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{assembly.assembly_name}</div>
                        <div className="text-sm text-gray-500 font-mono">{assembly.assembly_code}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 capitalize">{assembly.assembly_category || '-'}</td>
                    <td className="px-6 py-4">
                      {assembly.criticality ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCriticalityColor(assembly.criticality)}`}>
                          {assembly.criticality}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{assembly.parts_count || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        assembly.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {assembly.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingAssembly(assembly);
                            setShowEditModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Edit
                        </button>
                        <Link href={`/assembly/${assembly.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          View
                        </Link>
                        <Link href={`/parts/partLists?assembly_id=${assembly.id}`} className="text-green-600 hover:text-green-700 font-medium">
                          Parts
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredAssemblies.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assemblies found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first assembly.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Create Assembly
          </button>
        </div>
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Assembly"
        size="xl"
      >
        <AssemblyForm
          onSubmit={async (formData) => {
            setFormLoading(true);
            try {
              const response = await api.post('/assemblies', formData);
              if ((response.data as any)?.success) {
                setShowCreateModal(false);
                fetchAssemblies();
              }
            } catch (error) {
              console.error('Error creating assembly:', error);
            } finally {
              setFormLoading(false);
            }
          }}
          loading={formLoading}
          onCancel={() => setShowCreateModal(false)}
        />
      </FormModal>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAssembly(null);
        }}
        title="Edit Assembly"
        size="xl"
      >
        {editingAssembly && (
          <AssemblyForm
            initialData={editingAssembly}
            onSubmit={async (formData) => {
              setFormLoading(true);
              try {
                const response = await api.put(`/assemblies/${editingAssembly.id}`, formData);
                if ((response.data as any)?.success) {
                  setShowEditModal(false);
                  setEditingAssembly(null);
                  fetchAssemblies();
                }
              } catch (error) {
                console.error('Error updating assembly:', error);
              } finally {
                setFormLoading(false);
              }
            }}
            loading={formLoading}
            onCancel={() => {
              setShowEditModal(false);
              setEditingAssembly(null);
            }}
          />
        )}
      </FormModal>
    </div>
  );
}
