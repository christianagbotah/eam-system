'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import FormModal from '@/components/ui/FormModal';
import PartForm from '@/components/forms/PartForm';
import SearchableSelect from '@/components/SearchableSelect';
import StatusModal from '@/components/ui/StatusModal';

export default function PartListsPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', availability: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModal, setStatusModal] = useState({ type: 'success' as 'success' | 'error', title: '', message: '' });
  const searchParams = useSearchParams();
  const assemblyId = searchParams.get('assembly_id');
  const machineId = searchParams.get('machine_id');

  useEffect(() => {
    fetchParts();
  }, [filters, assemblyId, machineId]);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/parts');
      setParts(response.data?.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = parts.filter(part => {
    if (filters.search && !part.part_name?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !part.part_number?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && part.part_category !== filters.category) return false;
    if (filters.status && part.status !== filters.status) return false;
    if (filters.availability && part.spare_availability !== filters.availability) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'obsolete': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconClass = "w-5 h-5";
    switch (category) {
      case 'bearing': return <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="10" cy="10" r="3"/></svg>;
      case 'motor': return <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20"><path d="M10 2L3 7v6c0 5.55 3.84 9.74 9 9.74s9-4.19 9-9.74V7l-7-5z"/></svg>;
      case 'sensor': return <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
      default: return <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Parts & Components</h1>
          <p className="text-xs text-gray-600 mt-0.5">{filteredParts.length} parts found</p>
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
            + Add Part
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <input
              type="text"
              placeholder="Search parts..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <SearchableSelect
              value={filters.category}
              onChange={(value) => setFilters({...filters, category: value})}
              options={[
                { id: '', label: 'All Categories' },
                { id: 'bearing', label: 'Bearing' },
                { id: 'motor', label: 'Motor' },
                { id: 'sensor', label: 'Sensor' },
                { id: 'valve', label: 'Valve' },
                { id: 'pump', label: 'Pump' },
                { id: 'belt', label: 'Belt' },
                { id: 'gear', label: 'Gear' },
                { id: 'seal', label: 'Seal' },
                { id: 'filter', label: 'Filter' },
                { id: 'electrical', label: 'Electrical' }
              ]}
              placeholder="All Categories"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="obsolete">Obsolete</option>
          </select>
          <select
            value={filters.availability}
            onChange={(e) => setFilters({...filters, availability: e.target.value})}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Availability</option>
            <option value="yes">Spare Available</option>
            <option value="no">No Spare</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredParts.map(part => (
            <div key={part.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Part Image */}
              <div className="h-32 bg-gray-100 relative overflow-hidden">
                {part.part_image || part.image ? (
                  <img 
                    src={part.part_image || part.image} 
                    alt={part.part_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      part.part_category ? 'bg-purple-200 text-purple-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getCategoryIcon(part.part_category)}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 truncate">{part.part_name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{part.part_number}</p>
                </div>

                <div className="space-y-2 mb-4">
                  {part.part_category && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span className="text-sm text-gray-600 capitalize">{part.part_category}</span>
                    </div>
                  )}
                  {part.manufacturer && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      <span className="text-sm text-gray-600">{part.manufacturer}</span>
                    </div>
                  )}
                  {part.material && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span className="text-sm text-gray-600">{part.material}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(part.status)}`}>
                      {part.status}
                    </span>
                    {part.spare_availability === 'yes' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Spare
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPart(part);
                        setShowEditModal(true);
                      }}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">•</span>
                    <Link href={`/parts/${part.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Details
                    </Link>
                  </div>
                </div>

                {part.current_stock_qty !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Stock:</span>
                      <span className={`font-medium ${
                        part.current_stock_qty > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {part.current_stock_qty} units
                      </span>
                    </div>
                  </div>
                )}
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredParts.map(part => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          part.part_category ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getCategoryIcon(part.part_category)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{part.part_name}</div>
                          <div className="text-sm text-gray-500 font-mono">{part.part_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 capitalize">{part.part_category || '-'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{part.manufacturer || '-'}</td>
                    <td className="px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          part.current_stock_qty > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {part.current_stock_qty || 0}
                        </span>
                        {part.spare_availability === 'yes' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Spare
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(part.status)}`}>
                        {part.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingPart(part);
                            setShowEditModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Edit
                        </button>
                        <Link href={`/parts/${part.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          View
                        </Link>
                        <Link href={`/parts/assignPmTasksToPart/${part.id}`} className="text-green-600 hover:text-green-700 font-medium">
                          PM Tasks
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

      {filteredParts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
          <p className="text-gray-500 mb-6">Get started by adding your first part.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Create Part
          </button>
        </div>
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError('');
        }}
        title="Create New Part"
        size="xl"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <PartForm
          onSubmit={async (formData) => {
            setFormLoading(true);
            setError('');
            try {
              // Convert FormData to JSON object
              const jsonData = Object.fromEntries(formData);
              console.log('Submitting data:', jsonData);
              
              const response = await api.post('/parts', jsonData);
              console.log('API Response:', response);
              
              if (response.data?.status === 'success') {
                setShowCreateModal(false);
                setStatusModal({ type: 'success', title: 'Success!', message: 'Part created successfully' });
                setShowStatusModal(true);
                fetchParts();
              } else {
                setStatusModal({ type: 'error', title: 'Error', message: response.data?.message || 'Failed to create part' });
                setShowStatusModal(true);
              }
            } catch (error: any) {
              console.error('Full error:', error);
              console.error('Error response:', error?.response);
              const errorMsg = error?.response?.data?.message || error?.message || 'Operation failed';
              setStatusModal({ type: 'error', title: 'Error', message: errorMsg });
              setShowStatusModal(true);
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
          setEditingPart(null);
          setError('');
        }}
        title="Edit Part"
        size="xl"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {editingPart && (
          <PartForm
            initialData={editingPart}
            onSubmit={async (formData) => {
              setFormLoading(true);
              setError('');
              try {
                const jsonData = Object.fromEntries(formData);
                const response = await api.put(`/parts/${editingPart.id}`, jsonData);
                
                if (response.data?.status === 'success') {
                  setShowEditModal(false);
                  setEditingPart(null);
                  setStatusModal({ type: 'success', title: 'Success!', message: 'Part updated successfully' });
                  setShowStatusModal(true);
                  fetchParts();
                } else {
                  setStatusModal({ type: 'error', title: 'Error', message: response.data?.message || 'Failed to update part' });
                  setShowStatusModal(true);
                }
              } catch (error: any) {
                console.error('Error updating part:', error);
                const errorMsg = error?.response?.data?.message || error?.message || 'Operation failed';
                setStatusModal({ type: 'error', title: 'Error', message: errorMsg });
                setShowStatusModal(true);
              } finally {
                setFormLoading(false);
              }
            }}
            loading={formLoading}
            onCancel={() => {
              setShowEditModal(false);
              setEditingPart(null);
            }}
          />
        )}
      </FormModal>

      {/* Status Modal */}
      <StatusModal
        isOpen={showStatusModal}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setShowStatusModal(false)}
      />
    </div>
  );
}
