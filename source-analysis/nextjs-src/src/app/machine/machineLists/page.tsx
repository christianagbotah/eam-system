'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GridSkeleton } from '@/components/LoadingSkeleton';
import FormModal from '@/components/ui/FormModal';
import MachineForm from '@/components/forms/MachineForm';
import api from '@/lib/api';

export default function MachineListsPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', criticality: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, maintenance: 0, critical: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMachines();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets-unified');
      const allAssets = response.data?.data || [];
      const machineData = allAssets.filter((a: any) => a.asset_type === 'machine');
      setMachines(machineData);
      
      // Calculate stats
      const total = machineData.length;
      const active = machineData.filter((m: any) => m.status === 'active' || m.status === 'operational').length;
      const maintenance = machineData.filter((m: any) => m.status === 'maintenance').length;
      const critical = machineData.filter((m: any) => m.criticality === 'critical').length;
      setStats({ total, active, maintenance, critical });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMachines = machines.filter(machine => {
    if (filters.search && !machine.name?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !machine.asset_tag?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && machine.status !== filters.status) return false;
    if (filters.type && machine.category !== filters.type) return false;
    if (filters.criticality && machine.criticality !== filters.criticality) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'operational': return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
          <h1 className="text-lg font-semibold text-gray-900">Equipment & Machines</h1>
          <p className="text-xs text-gray-600 mt-0.5">{filteredMachines.length} machines found</p>
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
            + Add Machine
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Machines</p>
              <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-lg font-semibold text-green-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="text-lg font-semibold text-yellow-600">{stats.maintenance}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-lg font-semibold text-red-600">{stats.critical}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <input
              type="text"
              placeholder="Search machines..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="down">Down</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="production">Production</option>
            <option value="packaging">Packaging</option>
            <option value="conveyor">Conveyor</option>
            <option value="utility">Utility</option>
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
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <GridSkeleton cols={3} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMachines.map(machine => (
            <div key={machine.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Machine Image */}
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                {machine.machine_photo || machine.image ? (
                  <img 
                    src={machine.machine_photo || machine.image} 
                    alt={machine.asset_name || machine.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                    <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm bg-white/90 ${getStatusColor(machine.status)}`}>
                    {machine.status || 'Unknown'}
                  </span>
                  {machine.criticality && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm bg-white/90 ${getCriticalityColor(machine.criticality)}`}>
                      {machine.criticality}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{machine.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{machine.asset_tag}</p>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span>Type: {machine.category || 'Equipment'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    <span>Location: {machine.location || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    {machine.assemblies_count || 0} assemblies
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingMachine(machine);
                        setShowEditModal(true);
                      }}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">•</span>
                    <Link href={`/machine/show/${machine.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Details
                    </Link>
                    <span className="text-gray-300">•</span>
                    <Link href={`/assembly/assemblyLists?machine_id=${machine.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Assemblies
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criticality</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMachines.map(machine => (
                  <tr key={machine.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{machine.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{machine.asset_tag}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{machine.category || 'Equipment'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{machine.location || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {machine.criticality ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCriticalityColor(machine.criticality)}`}>
                          {machine.criticality}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(machine.status)}`}>
                        {machine.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingMachine(machine);
                            setShowEditModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Edit
                        </button>
                        <Link href={`/machine/show/${machine.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          View
                        </Link>
                        <Link href={`/assembly/assemblyLists?machine_id=${machine.id}`} className="text-green-600 hover:text-green-700 font-medium">
                          Assemblies
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

      {filteredMachines.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No machines found</h3>
          <p className="text-gray-500 mb-6">Get started by adding your first machine.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Create Machine
          </button>
        </div>
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Machine"
        size="xl"
      >
        <MachineForm
          onSubmit={async (formData) => {
            setFormLoading(true);
            try {
              const response = await api.post('/assets/machines', formData);
              if ((response.data as any)?.success) {
                setShowCreateModal(false);
                fetchMachines();
              }
            } catch (error) {
              console.error('Error creating machine:', error);
            } finally {
              setFormLoading(false);
            }
          }}
          loading={formLoading}
        />
      </FormModal>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMachine(null);
        }}
        title="Edit Machine"
        size="xl"
      >
        {editingMachine && (
          <MachineForm
            initialData={editingMachine}
            onSubmit={async (formData) => {
              setFormLoading(true);
              try {
                const response = await api.put(`/assets/machines/${editingMachine.id}`, formData);
                if ((response.data as any)?.success) {
                  setShowEditModal(false);
                  setEditingMachine(null);
                  fetchMachines();
                }
              } catch (error) {
                console.error('Error updating machine:', error);
              } finally {
                setFormLoading(false);
              }
            }}
            loading={formLoading}
          />
        )}
      </FormModal>
    </div>
  );
}
