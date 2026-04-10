'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import FormModal from '@/components/ui/FormModal';
import PartForm from '@/components/forms/PartForm';
import AssemblyForm from '@/components/forms/AssemblyForm';

export default function AssemblyDetailsPage() {
  const params = useParams();
  const [assembly, setAssembly] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePartModal, setShowCreatePartModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchAssembly();
      fetchParts();
    }
  }, [params.id]);

  const fetchAssembly = async () => {
    try {
      const response = await api.get(`/assemblies/${params.id}`);
      setAssembly((response.data as any)?.data);
      setEditingAssembly((response.data as any)?.data);
    } catch (error) {
      console.error('Error fetching assembly:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await api.get(`/parts?component_id=${params.id}`);
      setParts((response.data as any)?.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!assembly) {
    return <div className="text-center py-12">Assembly not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{assembly.assembly_name}</h1>
          <p className="text-gray-600">Code: {assembly.assembly_code}</p>
        </div>
        <Link href="/assembly/assemblyLists" className="text-blue-600 hover:underline">
          ← Back to Assemblies
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Assembly Image */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Assembly Image</h2>
          </div>
          <div className="p-6">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {assembly.assembly_image || assembly.image ? (
                <img 
                  src={assembly.assembly_image || assembly.image} 
                  alt={assembly.assembly_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                  <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {/* Assembly Overview */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Assembly Overview</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assembly Name</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{assembly.assembly_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assembly Code</label>
                    <p className="mt-1 text-sm font-mono bg-gray-100 px-3 py-1 rounded">{assembly.assembly_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Category</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{assembly.assembly_category || 'Not specified'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Criticality Level</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        assembly.criticality === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                        assembly.criticality === 'high' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        assembly.criticality === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          assembly.criticality === 'critical' ? 'bg-red-500' :
                          assembly.criticality === 'high' ? 'bg-orange-500' :
                          assembly.criticality === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></span>
                        {assembly.criticality || 'medium'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        assembly.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          assembly.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                        }`}></span>
                        {assembly.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Parts</label>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{parts.length}</p>
                  </div>
                </div>
              </div>
              {assembly.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</label>
                  <p className="mt-2 text-gray-700 leading-relaxed">{assembly.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Parts Section */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Parts ({parts.length})</h2>
                <button
                  onClick={() => setShowCreatePartModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  + Add Part
                </button>
              </div>
            </div>
            <div className="p-6">
              {parts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {parts.map((part) => (
                    <div key={part.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{part.part_name}</h3>
                              <p className="text-sm text-gray-500 font-mono">{part.part_number}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {part.part_category && (
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                    {part.part_category}
                                  </span>
                                )}
                                {part.spare_availability === 'yes' && (
                                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    Spare Available
                                  </span>
                                )}
                              </div>
                              {part.manufacturer && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Manufacturer:</span> {part.manufacturer}
                                </p>
                              )}
                              {part.material && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Material:</span> {part.material}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            part.status === 'active' ? 'bg-green-100 text-green-800' :
                            part.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {part.status}
                          </span>
                          <Link href={`/parts/${part.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No parts yet</h3>
                  <p className="text-gray-500 mb-4">Start building this assembly by adding parts.</p>
                  <button
                    onClick={() => setShowCreatePartModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Add First Part
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => setShowCreatePartModal(true)}
                className="block w-full text-center bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Add Part
              </button>
              <button
                onClick={() => {
                  setEditingAssembly(assembly);
                  setShowEditModal(true);
                }}
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Edit Assembly
              </button>
              <button className="block w-full text-center bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                View History
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Assembly Stats</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Parts</span>
                <span className="text-lg font-bold text-blue-600">{parts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Parts</span>
                <span className="text-lg font-bold text-green-600">{parts.filter(p => p.status === 'active').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Spare Available</span>
                <span className="text-lg font-bold text-purple-600">{parts.filter(p => p.spare_availability === 'yes').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Part Modal */}
      <FormModal
        isOpen={showCreatePartModal}
        onClose={() => setShowCreatePartModal(false)}
        title="Add Part to Assembly"
        size="xl"
      >
        <PartForm
          onSubmit={async (formData) => {
            setFormLoading(true);
            formData.append('assembly_id', assembly.id);
            try {
              const response = await api.post('/parts', formData);
              if ((response.data as any)?.success) {
                setShowCreatePartModal(false);
                fetchParts();
              }
            } catch (error) {
              console.error('Error creating part:', error);
            } finally {
              setFormLoading(false);
            }
          }}
          loading={formLoading}
        />
      </FormModal>

      {/* Edit Assembly Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Assembly"
        size="xl"
      >
        {editingAssembly && (
          <AssemblyForm
            initialData={editingAssembly}
            onSubmit={async (formData) => {
              setFormLoading(true);
              try {
                const response = await api.post(`/assemblies/${editingAssembly.id}?_method=PUT`, formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  }
                });
                if (response.data?.success || response.status === 200) {
                  setShowEditModal(false);
                  fetchAssembly();
                }
              } catch (error) {
                console.error('Error updating assembly:', error);
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